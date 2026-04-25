/**
 * Auth / MongoDB connectivity diagnostic endpoint.
 *
 * Visit http://localhost:3000/api/debug/auth to see a JSON report of every
 * step involved in authenticating + persisting users. This endpoint is
 * intentionally verbose and should NEVER be exposed in production.
 *
 * Checks performed, in order:
 *   1. Env var presence (MONGODB_URI / Google / NEXTAUTH)
 *   2. Parse MONGODB_URI to determine scheme (srv vs direct) and hosts
 *   3. DNS resolvers in use
 *   4. DNS A lookup for each shard host
 *   5. Raw TCP connectivity to each shard:27017
 *   6. Raw TLS handshake to each shard:27017 (surfaces Atlas IP-allowlist
 *      rejections as `tlsv1 alert internal error`)
 *   7. MongoClient.connect() + admin ping
 *   8. Public egress IP (so you know what to whitelist in Atlas)
 *
 * Each step is captured independently so one failure does not mask later
 * information. The response always returns HTTP 200 with
 * `{ ok, report: [...] }`.
 */

import { NextResponse } from "next/server";
import dns from "dns";
import net from "net";
import tls from "tls";
import { MongoClient } from "mongodb";
import { ensureDnsBootstrapped } from "@/lib/dnsBootstrap";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Step = {
  step: string;
  ok: boolean;
  data?: unknown;
  error?: string;
  elapsedMs?: number;
};

function redact(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:***@");
  } catch {
    return "<unparseable>";
  }
}

function parseMongoUri(uri: string): {
  scheme: "srv" | "direct" | "unknown";
  hosts: { host: string; port: number }[];
  params: Record<string, string>;
  database?: string;
} {
  // Mongo connection strings allow comma-separated hosts (e.g. replica set
  // seed lists), which Node's WHATWG `URL` parser does not accept. Parse
  // manually.
  const m = uri.match(
    /^(mongodb(?:\+srv)?):\/\/(?:[^@/]+@)?([^/?#]+)(?:\/([^?#]*))?(?:\?([^#]*))?/i
  );
  if (!m) return { scheme: "unknown", hosts: [], params: {} };
  const scheme = m[1].toLowerCase() === "mongodb+srv" ? "srv" : "direct";
  const hostPart = m[2];
  const database = m[3] ? decodeURIComponent(m[3]) : undefined;
  const queryPart = m[4] ?? "";

  const hosts = hostPart
    .split(",")
    .filter(Boolean)
    .map((hp) => {
      const [host, port] = hp.split(":");
      return {
        host,
        port: port ? Number(port) : scheme === "srv" ? 27017 : 27017,
      };
    });

  const params: Record<string, string> = {};
  if (queryPart) {
    for (const kv of queryPart.split("&")) {
      if (!kv) continue;
      const [k, v = ""] = kv.split("=");
      params[decodeURIComponent(k)] = decodeURIComponent(v);
    }
  }

  return { scheme, hosts, params, database };
}

async function withTimeout<T>(
  label: string,
  ms: number,
  fn: () => Promise<T>
): Promise<T> {
  return await Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      )
    ),
  ]);
}

async function dnsLookup(host: string): Promise<string[]> {
  const res = await dns.promises.lookup(host, { all: true });
  return res.map((r) => `${r.address} (v${r.family})`);
}

type TcpProbeResult =
  | { ok: true; remoteAddress?: string }
  | { ok: false; error: string };

function tcpProbe(host: string, port: number, timeoutMs = 5000) {
  return new Promise<TcpProbeResult>((resolve) => {
    const socket = new net.Socket();
    let settled = false;
    const done = (res: TcpProbeResult) => {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch {}
      resolve(res);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      done({ ok: true, remoteAddress: socket.remoteAddress ?? undefined });
    });
    socket.once("timeout", () => done({ ok: false, error: "timeout" }));
    socket.once("error", (err) => done({ ok: false, error: err.message }));
    socket.connect(port, host);
  });
}

type TlsProbeResult =
  | {
      ok: true;
      authorized: boolean;
      protocol: string | null;
      peerCN?: string;
    }
  | { ok: false; error: string };

function tlsProbe(host: string, port: number, timeoutMs = 7000) {
  return new Promise<TlsProbeResult>((resolve) => {
    let settled = false;
    const done = (res: TlsProbeResult) => {
      if (settled) return;
      settled = true;
      try {
        socket.end();
      } catch {}
      resolve(res);
    };
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const cn = cert?.subject?.CN;
        const peerCN =
          typeof cn === "string" ? cn : Array.isArray(cn) ? cn[0] : undefined;
        done({
          ok: true,
          authorized: socket.authorized,
          protocol: socket.getProtocol(),
          peerCN,
        });
      }
    );
    socket.setTimeout(timeoutMs);
    socket.once("timeout", () => done({ ok: false, error: "timeout" }));
    socket.once("error", (err) => done({ ok: false, error: err.message }));
  });
}

async function fetchEgressIp(): Promise<string | null> {
  try {
    const res = await withTimeout("egressIp", 4000, () =>
      fetch("https://api.ipify.org?format=json", { cache: "no-store" })
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { ip?: string };
    return j.ip ?? null;
  } catch {
    return null;
  }
}

export async function GET() {
  ensureDnsBootstrapped();
  const report: Step[] = [];
  const t0 = Date.now();

  // 1. Env var presence
  const env = {
    MONGODB_URI: !!process.env.MONGODB_URI,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
      ? `${process.env.GOOGLE_CLIENT_ID.slice(0, 14)}…`
      : null,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    NODE_ENV: process.env.NODE_ENV,
  };
  report.push({ step: "env", ok: env.MONGODB_URI && env.GOOGLE_CLIENT_SECRET, data: env });

  const uri = process.env.MONGODB_URI ?? "";
  if (!uri) {
    return NextResponse.json({
      ok: false,
      report,
      summary: "MONGODB_URI is not set. Check bodhi/.env.local.",
    });
  }

  // 2. Parse URI
  const parsed = parseMongoUri(uri);
  report.push({
    step: "parseMongoUri",
    ok: parsed.hosts.length > 0,
    data: {
      scheme: parsed.scheme,
      hosts: parsed.hosts,
      database: parsed.database,
      params: parsed.params,
      redactedUri: redact(uri),
    },
  });

  // 3. DNS resolvers
  report.push({
    step: "dnsServers",
    ok: true,
    data: { servers: dns.getServers() },
  });

  // 4–6. Per-host DNS + TCP + TLS probes
  for (const { host, port } of parsed.hosts) {
    const tDns = Date.now();
    try {
      const addrs = await withTimeout(`dns:${host}`, 5000, () => dnsLookup(host));
      report.push({
        step: `dnsLookup:${host}`,
        ok: true,
        data: { addrs },
        elapsedMs: Date.now() - tDns,
      });
    } catch (err) {
      report.push({
        step: `dnsLookup:${host}`,
        ok: false,
        error: (err as Error).message,
        elapsedMs: Date.now() - tDns,
      });
      continue;
    }

    const tTcp = Date.now();
    const tcp = await tcpProbe(host, port);
    report.push({
      step: `tcp:${host}:${port}`,
      ok: tcp.ok,
      data: tcp.ok ? { remoteAddress: tcp.remoteAddress } : undefined,
      error: tcp.ok ? undefined : tcp.error,
      elapsedMs: Date.now() - tTcp,
    });
    if (!tcp.ok) continue;

    const tTls = Date.now();
    const tlsRes = await tlsProbe(host, port);
    report.push({
      step: `tls:${host}:${port}`,
      ok: tlsRes.ok,
      data: tlsRes.ok
        ? {
            authorized: tlsRes.authorized,
            protocol: tlsRes.protocol,
            peerCN: tlsRes.peerCN,
          }
        : undefined,
      error: tlsRes.ok ? undefined : tlsRes.error,
      elapsedMs: Date.now() - tTls,
    });
  }

  // 7. MongoClient ping
  const tMongo = Date.now();
  try {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
    await withTimeout("mongoConnect", 12000, () => client.connect());
    const admin = client.db("admin").admin();
    const ping = await withTimeout("mongoPing", 5000, () => admin.ping());
    await client.close();
    report.push({
      step: "mongoPing",
      ok: true,
      data: ping,
      elapsedMs: Date.now() - tMongo,
    });
  } catch (err) {
    const e = err as Error & { code?: unknown };
    report.push({
      step: "mongoPing",
      ok: false,
      error: `${e.name}: ${e.message}`,
      data: { code: e.code },
      elapsedMs: Date.now() - tMongo,
    });
  }

  // 8. Egress IP (useful for Atlas IP access list)
  const egressIp = await fetchEgressIp();
  report.push({
    step: "egressIp",
    ok: egressIp !== null,
    data: { ip: egressIp },
  });

  // Summary heuristics
  const pingStep = report.find((r) => r.step === "mongoPing");
  let summary = "";
  if (pingStep?.ok) {
    summary = "MongoDB is reachable and ping succeeded. Auth should work.";
  } else {
    const tlsFailed = report.some(
      (r) => r.step.startsWith("tls:") && !r.ok
    );
    const tlsAlertInternal = pingStep?.error?.includes("tlsv1 alert internal");
    const tcpFailed = report.some(
      (r) => r.step.startsWith("tcp:") && !r.ok
    );
    const dnsFailed = report.some(
      (r) => r.step.startsWith("dnsLookup:") && !r.ok
    );
    if (dnsFailed) {
      summary = "DNS lookup to an Atlas shard failed. Your resolver is blocking the lookup.";
    } else if (tcpFailed) {
      summary = "TCP connection to Atlas on port 27017 was blocked (firewall/VPN/ISP).";
    } else if (tlsAlertInternal || tlsFailed) {
      summary =
        "Atlas closed the TLS handshake with 'internal error'. This nearly always means your current public IP is NOT in the Atlas Network Access / IP allowlist. " +
        "Go to https://cloud.mongodb.com → Security → Network Access → Add IP Address → either add the egressIp above, or click 'Allow access from anywhere' (0.0.0.0/0) for local development.";
    } else {
      summary = "MongoDB ping failed — see the report for details.";
    }
  }

  return NextResponse.json(
    {
      ok: !!pingStep?.ok,
      totalMs: Date.now() - t0,
      summary,
      report,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
