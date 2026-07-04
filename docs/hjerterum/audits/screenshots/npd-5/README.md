# NPD-5 screenshot archive

Place persona screenshot sets here after NPD-5 sign-off.

## Naming

```
npd-5-{persona}-{route}-{theme}-{locale}.png
```

Example: `npd-5-tina-nav-database-dark-no.png`

Alternative (persona walkthrough):

```
p1-tina-nav-listing-dark.png
p2-tommy-manage-light.png
p5-guest-landing-320.png
```

## Required sets (minimum)

| Persona | Routes | Themes | Locales |
|---------|--------|--------|---------|
| guest | `/`, `/login` | dark, light | no |
| tina | `/nav/database`, listing nav view | dark, light | no, se |
| tommy | `/homeowner/manage`, register | dark | no |
| emma | `/finn`, `/finn/mine` | dark, light | en |
| los | `/los` | dark | no |
| ops | `/ops/stats` | dark | no |

Store in PR comment or this folder before marking NPD-5 DONE. Link deployment URL and git SHA in `NPD_5_UI_DESIGN_REFRESH.md` §8 when NPD-5 closes.
