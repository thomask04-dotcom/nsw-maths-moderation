# Moderation review — October 2026

Consistency and Common Grade Scale (CGS) alignment review of every portfolio in this repository, plus the new features added at the same time.

## Common Grade Scale wording now used

Every rationale, banner, matrix and rubric uses the NESA wording below, and the achievement **language replaces letter grades** throughout (no "Grade B", "(C)" or letter badges remain).

| Level | Wording used |
|---|---|
| Extensive | extensive knowledge and understanding of the content, readily applied; very high competence in the processes and skills, applied to **new situations** |
| Thorough | thorough knowledge and understanding of the content; high level of competence; applied to **most situations** |
| Sound | sound knowledge and understanding of the **main areas of content**; adequate level of competence |
| Basic | basic knowledge and understanding of the content; limited level of competence |
| Elementary | elementary knowledge and understanding in **few areas** of the content; very limited competence in some of the processes and skills |

Early Stage 1: the CGS is not required for reporting in Early Stage 1. Kindergarten portfolios use the descriptor language for Thorough, Sound and Basic only, and say so.

## Issues found and fixed

**Language not aligned to the CGS**
- Thorough was described as applying knowledge "to *familiar* situations" in every portfolio (53 places). The CGS says "most situations". Fixed everywhere, including Working Mathematically matrix cells.
- Extensive said "unfamiliar situations" and "knowledge and skills"; now "knowledge and understanding … new situations".
- Sound said "sound knowledge and skills"; now "sound knowledge and understanding of the main areas of content".
- Basic and Elementary said "knowledge and skills"; now "knowledge and understanding".
- Overstated wording that the CGS does not use ("flawless", "masterful", "exemplary") replaced with accurate, evidence-based wording.
- Teacher running records that stated a level ("demonstrated thorough understanding", "with adequate competence") rewritten as observations, so the evidence does not pre-empt the judgement.
- Rubber stamps on student work that named a level ("VERY THOROUGH", "SOUND ATTAINMENT", "VERY HIGH COMPETENCE") replaced with ordinary classroom stamps.
- Labels that attributed simulated decisions to NESA ("NESA Moderation Rationale", "NESA Kindergarten Scale", "Key NESA Differentiator") reworded; NESA has no Kindergarten grade scale.

**Early Stage 1**
- Bush Picnic and Toy Workshop stated that Kindergarten is moderated against "Grades B, C and D". Replaced with the correct position: the CGS is not required in ES1; samples use its Thorough/Sound/Basic language.
- Bush Picnic rubric listed only the Sound descriptor; now lists Thorough, Sound and Basic in full.

**Content and structure**
- *Community Playground Toy Box Challenge* only had real work samples for Extensive; Thorough, Sound, Basic and Elementary were one-line summaries and the matrix was a placeholder, although the index promised 10 students. Eight full work samples (Benjamin, Sophie, Chloe, Liam, Daniel, Mia, Eli, Noah) and a complete comparison matrix were added. Its task brief was also expanded.
- Invalid outcome code `MA1-WM-01` (Stage 1 files) and `MA1-WM-01 / MAO-WM-01` (Bush Picnic) corrected to `MAO-WM-01`.
- Sports Day matrix referred to "Sophie/Mia" for the Sound sample; corrected to Mia.
- School Fun Day Stall subtitle implied Stage 2 content ("to Additive Relations"); corrected to Combining and Separating Quantities.
- Rubric pop-ups in the Stage 1–style portfolios now all show the full CGS wording.

**Visual consistency**
- Five portfolios coloured the levels differently from the others (e.g. Thorough blue in one file, green in another). All portfolios and the index now share one colour code: Extensive purple, Thorough green, Sound blue, Basic amber, Elementary rose. Student work keeps its own colours.

## New

- **The Kindy Fruit Market** (Early Stage 1) — Representing Whole Numbers and Combining & Separating Quantities (MAE-RWN-01, MAE-RWN-02, MAE-CSQ-01, MAE-CSQ-02, MAO-WM-01). Six samples: Thorough (Harper, Ari), Sound (Isla, Mason), Basic (Zoe, Kai), with teacher scribing, rationales and a matrix.
- **Professional judgement mode** (`moderation-tools.js`, shared by every portfolio). Set *Moderation decisions* to *Hidden*, or use **Judge First** on the index (opens the portfolio with `?judge=1`). Samples appear as Sample 1, 2, 3… in a shuffled order with every level cue hidden (tabs, banners, colours, stamps, rationales, matrix). Teachers choose a level, note their evidence, then reveal the moderated level and see how their judgement compares. Judgements are kept in the browser only.
- **Print this sample** prints only the sample on screen. In judgement mode it prints without the decision and adds a "circle one" judgement box and evidence lines for moderation meetings. **Print all samples** prints the whole portfolio.
- Index cards collapse the student-to-level list by default so it does not give away decisions before a teacher judges.

## Adding a new portfolio

Include the shared tools before `</body>`:

```html
<script src="moderation-tools.js" data-scale="cgs" defer></script>   <!-- data-scale="es1" for Kindergarten -->
```

and mark each work sample with `data-mod-sample data-mod-level="Sound" data-mod-student="Name" data-mod-open="switchTab('gradeC')"`. Decision content inside a sample is hidden automatically if it uses `.grade-badge`, `.teacher-banner`, `.teacher-check`, `.rubber-stamp` or `.mod-decision`. See the comment at the top of `moderation-tools.js` for the full list.
