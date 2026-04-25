# Bodhi — AI-Powered Buddhist Practice Companion

A calm, intelligent companion that helps people learn Buddhist teachings, build daily practice, and find grounded support.

## Features

- Agentic AI chat with Claude
- RAG scripture retrieval
- Web search integration
- Reddit community analytics
- Personalized learning paths
- Scripture library
- Prayer wall
- Animated monk character

## Tech Stack

- Next.js 14
- TypeScript
- Tailwind CSS
- Anthropic Claude API
- Tavily Search API
- Python for data analysis

## Getting Started

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd <repo-folder>/bodhi
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env.local` in `bodhi/`:
   ```env
   ANTHROPIC_API_KEY=your_key_here
   TAVILY_API_KEY=your_key_here
   ```
4. Run the app:
   ```bash
   npm run dev
   ```

Open `http://localhost:3000`.

## Data Analysis

Reddit data tooling is located in `/scripts/` (repository root).

- `scripts/reddit_scraper.py`
  - Fetches posts from:
    - `r/Buddhism`
    - `r/Meditation`
    - `r/zenbuddhism`
    - `r/theravada`
  - Saves to `data/reddit_posts.json`.
- `scripts/analyze_posts.py`
  - Uses Claude to classify topic + sentiment in batches
  - Outputs:
    - `data/topic_analysis.json`
    - `data/sentiment_analysis.json`
    - `data/summary_stats.json`

Example run (from repository root):

```bash
pip install -r requirements.txt
python scripts/reddit_scraper.py --posts-per-subreddit 500
python scripts/analyze_posts.py
```

Set `ANTHROPIC_API_KEY` in your environment before running `analyze_posts.py`.

## Project Structure

```text
bodhi/
  src/
    app/
      page.tsx              # Landing page
      chat/                 # Chat interface
      scriptures/           # Scripture library + reader route
      prayers/              # Prayers page
      dashboard/            # Practice dashboard
      insights/             # Analytics insights page
      api/
        chat/route.ts       # Claude orchestration endpoint
    components/             # Shared UI components
    lib/                    # Prompts, tools, retrieval, constants
    data/                   # Static analytics JSON used by UI
scripts/                    # Reddit scraping + analysis scripts
data/                       # Generated analysis outputs
```
