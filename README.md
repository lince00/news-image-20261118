# THE WORLD TODAY — Wednesday 18 November 2026

A program that draws, in code only, a one-page newspaper front page
summing up the day's world news, and writes it to `/output/entry.png`.

Entry for the make.fun bounty
[`news-image-20261118`](https://make.fun/bounty/news-image-20261118)
("Sum up 18 November's world news in one image").

## The page

- Masthead: **THE WORLD TODAY — Wednesday 18 November 2026**
- 12 featured stories with headline + summary, all real news of
  Wednesday 18 November 2026 (APEC three-way summit in Shenzhen,
  Gulf strikes, Crimea bridge, Alaska Senate race, Nvidia record
  quarter, Cyclone Akvan, Cyclone Xavier, Ebola in DR Congo, US
  measles status, Jeffries for Speaker, GTA VI launch, Voyager 1)
- A numbered world map marking where the news happened
  (11 numbered locations; Voyager 1 is 25.9bn km out, off the map)
- `ALSO ON WEDNESDAY`: 23 more real stories, numbered 13–35
- Sources: AP, Reuters, AFP, BBC, Al Jazeera, Yonhap, PBS, NASA,
  IMD, UN News. Markets strip at the foot of the page.

35 real stories in total. No network, no clock, no randomness:
running `main.ts` twice writes byte-identical PNG output.

## Run

```sh
node main.ts            # writes /output/entry.png (1024x1024, < 1 MiB)
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node 22 standard library only. MIT licensed.
