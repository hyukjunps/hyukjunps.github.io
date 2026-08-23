# O.Poong Third-Party Notices

This file records third-party material used by O.Poong. The license of O.Poong's own source code is separate from the licenses listed below.

## Open English-Korean Dictionary

O.Poong's offline English-Korean dictionary loads the JSON distribution of **Open English-Korean Dictionary** by `jhseo1211` / the LexiSnap project team.

- Project: https://github.com/jhseo1211/open-english-korean-dict
- Pinned source revision: `92cbfe63deee1ccead2c42677027d8b4a305b2c7`
- Data file: `dict/words.json`
- License declared by the upstream project: **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**
- License text: https://creativecommons.org/licenses/by-sa/4.0/
- Upstream credits: https://github.com/jhseo1211/open-english-korean-dict/blob/main/CREDITS.md

O.Poong does not vendor or rewrite the dictionary dataset in this repository. The app downloads the pinned upstream JSON file directly to the user's browser cache when the user chooses to save the offline dictionary, and displays the supplied fields such as Korean meaning, IPA, part of speech, CEFR level, and frequency rank.

Attribution and license links are also shown inside the O.Poong dictionary screen so that they remain visible to end users.

### Upstream data sources credited by Open English-Korean Dictionary

The upstream project's `CREDITS.md` identifies the following sources. Their respective notices and license terms remain applicable to the portions derived from them.

| Source | License stated upstream | Source URL |
| --- | --- | --- |
| kengdic (Korean-English Dictionary) | CC BY-SA 3.0 | https://github.com/garfieldnate/kengdic |
| cc-kedict (Creative Commons Korean-English) | CC BY-SA 3.0 | https://github.com/mhagiwara/cc-kedict |
| CMU Pronouncing Dictionary | BSD | http://www.speech.cs.cmu.edu/cgi-bin/cmudict |
| ipa-dict (Open Dict Data) | MIT | https://github.com/open-dict-data/ipa-dict |
| NGSL (New General Service List) | CC BY-SA | http://www.newgeneralservicelist.org |
| NAWL (New Academic Word List) | CC BY-SA | http://www.newacademicwordlist.org |
| CEFR-J Wordlist | CC BY-SA 4.0 | https://github.com/openlanguageprofiles/olp-en-cefrj |
| Wiktionary (via kaikki.org) | CC BY-SA 3.0 | https://kaikki.org |

The upstream project also states that hand-curated translations and LLM-assisted translations are original works by the LexiSnap project team.

## Notes for future dictionary updates

If the dictionary revision is changed later, review the upstream README and CREDITS again before updating the pinned revision. Preserve attribution in both this file and the in-app dictionary screen, and keep any adaptations of the CC BY-SA material under the applicable ShareAlike terms.
