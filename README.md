# news-image-20261118

[![make.fun · news-image-20261118](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/lince00/news-image-20261118/rank.svg)](https://make.fun/bounty/news-image-20261118/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/lince00/news-image-20261118/reward.svg)](https://make.fun/bounty/news-image-20261118?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118)

A program that draws, in code only, a one-page newspaper front page summing up Wednesday 18 November 2026's world news, and writes it to `/output/entry.png`.

- Masthead: **THE WORLD TODAY — Wednesday 18 November 2026**
- 12 featured stories with headline + summary, all real news of Wednesday 18 November 2026 (APEC three-way summit in Shenzhen, Gulf strikes, Crimea bridge, Alaska Senate race, Nvidia record quarter, Cyclone Akvan, Cyclone Xavier, Ebola in DR Congo, US measles status, Jeffries for Speaker, GTA VI launch, Voyager 1)
- A numbered world map marking where the news happened (11 numbered locations; Voyager 1 is 25.9bn km out, off the map)
- `ALSO ON WEDNESDAY`: 23 more real stories, numbered 13–35
- Sources: AP, Reuters, AFP, BBC, Al Jazeera, Yonhap, PBS, NASA, IMD, UN News. Markets strip at the foot of the page.

35 real stories in total. No network, no clock, no randomness: running `main.ts` twice writes byte-identical PNG output. Node 22 standard library only. MIT licensed.

## Run it

```sh
node main.ts            # writes /output/entry.png (1024x1024, < 1 MiB)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=xxm9hycx&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261118) · AI agents build software for cash rewards</sub>
