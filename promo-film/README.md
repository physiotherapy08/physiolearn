# PhysioLearn — promo & install tutorial film (vertical)

1080×1920 · 30 fps · 3:48 · Arabic voice-over supplied by Mohammed Al-Barashdi (@mohammed_pt).

## How it is built
- `web/film.html` + `web/film.js`: the whole film is one HTML page; `render(t)` draws the frame at time *t*. Everything is code: no generative video tools.
- `render.py`: headless Chromium screenshots every frame (2 workers), then ffmpeg encodes.
- `sound.py`: places the original voice on the film timeline (voice itself unprocessed), synthesizes taps, whooshes, impacts, chimes, typing ticks and a soft pad bed, ducks music and SFX under the voice.
- `demo/` + `cap*.py`: the **real PhysioLearn app** run locally with fictional demo content and captured at iPhone size. These captures are the screens shown inside the phone.

## Timeline (film seconds)
| Time | Scene |
|---|---|
| 0–9 | Hook: line-art knowledge elements (anatomy, books, diagrams) gather into the PhysioLearn logo; «أعمق» / «أفضل» hero words |
| 9–36 | The student's journey: path, lecture hall, questions, skills, scattered sources, «تحدٍّ» |
| 36–52 | The idea: sources fly into the phone; «في مساحة واحدة» |
| 53–55 | «ماذا تقدّم لك المنصة؟» |
| 55–120 | Real app demo: summaries · books · quiz (open, answer, result 80%, review) · clinical cases + knowledge→application diagram · YouTube channels |
| 120–139 | Personal account: settings card, progress card, saved items, multi-device sync |
| 139–157 | No more searching for the link → install as an app; chapter card |
| 157–173 | **iPhone tutorial** (iOS 26 Safari): open link → ••• → Share → scroll → Add to Home Screen → Open as Web App → Add → icon on home screen → tap → app opens |
| 173–199 | **Android tutorial** (Chrome): open link → ⋮ menu → Install app → Install dialog → icon on home screen → tap → app opens |
| 199–219 | Brand reveal with the Naskh tagline, values, «ابدأ رحلتك…» |
| 219–228 | PHYSIOLEARN · YOUR KNOWLEDGE. YOUR JOURNEY. → creator card @mohammed_pt |

## Editing decisions
- **Two pauses added to the voice track** (voice audio untouched): +4 s after the iPhone steps and +2 s after "بحسب الخيار الذي يظهر على جهازك", so the "Add/Install" confirmation, the new icon and the app opening are visible before the narration moves on. Plus a 1.5 s visual pre-roll for the hook.
- Vertical 9:16 (as requested in chat) instead of the brief's 16:9.
- No subtitles (brief: "no unnecessary subtitles"); short Arabic keywords and step labels only.

## Accuracy notes
- App screens are the real PhysioLearn interface. Content (subjects, summaries, quiz questions, books, cases) is **fictional demo content** written for the film; book covers are invented; no real student data or email appears (the demo account is "طالب تجريبي").
- Safari and Chrome are **recreated in code** from the current iOS 26 Safari flow (••• → Share → Add to Home Screen → Open as Web App → Add) and Android Chrome (⋮ → Install app → Install). They are faithful reconstructions, not screen recordings. Device UI is shown in English because that is how the menus appear on most phones; Arabic step labels sit above the phone.
- Home-screen app icons are generic placeholders (no third-party logos).
- Quiz questions are medically accurate (axillary nerve → deltoid; teres major not in the rotator cuff; Erb's palsy C5–C6; carpal tunnel → median nerve; supraspinatus initiates abduction).

## App fixes found while making the film (released as v1.3)
English text in summaries, cases and quizzes now keeps its own left-to-right direction (punctuation no longer jumps to the wrong side).
