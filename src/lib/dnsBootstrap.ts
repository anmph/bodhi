import dns from "dns";

// Some ISP / home-router DNS resolvers (and Windows' default resolver in
// certain network configs) return REFUSED for SRV queries, which breaks
// `mongodb+srv://` connection strings with:
//   querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
//
// Google + Cloudflare public resolvers always answer SRV, so we point
// Node's DNS at them once per process. This only runs server-side because
// the mongo modules that import this are themselves server-only.
declare global {
  // eslint-disable-next-line no-var
  var _bodhiDnsBootstrapped: boolean | undefined;
}

export function ensureDnsBootstrapped(): void {
  if (global._bodhiDnsBootstrapped) return;
  global._bodhiDnsBootstrapped = true;

  try {
    const current = dns.getServers();
    // Public resolvers that reliably answer SRV queries. Put these FIRST
    // so Node doesn't ask a broken local/ISP resolver that returns REFUSED
    // for SRV lookups (common cause of `querySrv ECONNREFUSED` against
    // `mongodb+srv://` URIs).
    const publicResolvers = ["1.1.1.1", "8.8.8.8", "1.0.0.1", "8.8.4.4"];
    const ordered = Array.from(new Set([...publicResolvers, ...current]));
    dns.setServers(ordered);
    // Prefer IPv4 first — avoids sporadic IPv6-related resolver hangs on Windows.
    dns.setDefaultResultOrder?.("ipv4first");
    console.log(
      "[dnsBootstrap] DNS resolvers set to:",
      dns.getServers().join(", ")
    );
  } catch (err) {
    console.warn("[dnsBootstrap] failed to configure DNS servers", err);
  }
}
