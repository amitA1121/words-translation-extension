# מילון מילים - סמן ותרגם

הרחבת Chrome ללימוד אנגלית: לחיצה כפולה על מילה באתר או ב-PDF מציגה תרגום לעברית ומאפשרת לסמן אותה. מילים שמורות מודגשות אוטומטית בכל מקום שבו הן מופיעות.

## פיצ'רים

- **סימון והדגשה** — לחיצה כפולה (או לחיצה בודדת על מילה שכבר מסומנת) מציגה תרגום מיידי דרך Google Translate.
- **תמיכה מלאה ב-PDF** — viewer עצמאי מבוסס [pdf.js](https://github.com/mozilla/pdf.js) עם שכבת מילים מדויקת (per-word, לא per-line), כולל תמיכה בגופנים פרופורציונליים.
- **מילון מתקדם** — חיפוש דו-כיווני (אנגלית↔עברית) עם מספר תרגומים אפשריים והשמעה קולית.
- **מצב חזרה (flashcards)** — תרגול אקטיבי על מילים לא-נלמדות, עם ערבוב אקראי.
- **מעקב תדירות** — סופר כמה פעמים כל מילה שמורה נצפתה בפועל (לא רק הופיעה) בדפים שביקרת בהם.
- **הוספה דרך קליק ימני** — מסמן טקסט (כולל ביטויים מרובי-מילים) ולוחץ ימני להוספה למילון.
- **ייצוא ל-PDF** — רשימת המילים כטבלה מסודרת (Word / תרגום / סטטוס), עם פונט עברי מוטמע.
- **גיבוי אוטומטי** — הרשימה נשמרת גם ב-`chrome.storage.sync`, כך שהיא שורדת הסרה/התקנה מחדש של ההרחבה (כל עוד מחוברים לאותו חשבון Google).

## התקנה (מצב מפתח)

1. `chrome://extensions` → הפעל "מצב מפתח"
2. "טען הרחבה שלא נארזה" → בחר את התיקייה הזו

## מבנה הפרויקט

```
background.js           - service worker (composition root — חיווט בלבד)
content.js              - טוען classic-script דק שמייבא דינמית את contentEntry.js
popup.html/js/css       - ה-UI של הפופאפ (composition root)
pdf-viewer.html/js/css  - ה-PDF viewer העצמאי (composition root)

src/
  shared/               - שכבה משותפת לכל ההקשרים (background / content / popup / viewer):
    backgroundApi.js    -   פרוטוקול ההודעות במקום אחד: קבועי MSG + client מוקלד לכל הודעה
    words.js            -   מקור אמת יחיד ל"מהי מילה" (regexים) + סינון מילים שנלמדו
    dom.js              -   קבועי class/id משותפים (highlight, pdf-word, tooltip) + isEditable/byId
  background/           - צד ה-service worker: message router (מפת handlers) + broadcast לטאבים
  storage/              - שכבת chrome.storage.local + sync (כולל sharding לגיבוי)
  translation/          - קריאות ל-Google Translate
  highlighting/         - זיהוי מילים, הדגשה בדפים רגילים/PDF, מעקב תדירות צפייה
  ui/                   - כל רכיב UI כמודול/מחלקה נפרדים (tooltip, דיאלוגים, רשימת מילים)
  pdf-viewer/           - רינדור עמודי PDF (PdfRenderer), שכבת מילים, ו-toolbar/ניווט (ViewerController)
  audio/                - השמעה קולית משותפת (Web Speech API)
  dev/                  - מנגנון auto-reload לפיתוח

scripts/
  generate-dev-watch-list.js  - מעדכן את רשימת הקבצים שה-dev-reload עוקב אחריהם
```

## הערות ארכיטקטורה

- **ES Modules אמיתיים** בכל מקום שאפשר (`background.js`, `popup.js`, `pdf-viewer.js`) — ללא build step.
- **חריגה**: Manifest V3 לא מאפשר ל-content scripts שמוגדרים ב-manifest להשתמש ב-`import`/`export` סטטי. הפתרון: `content.js` הוא loader דק (classic script) שמריץ `import()` דינמי כדי לטעון את `src/ui/contentEntry.js` (ES module אמיתי).
- **אין React/Tailwind** — שניהם דורשים build step (JSX transpilation / Tailwind CLI) שהיה שובר את העיקרון של הרצה ישירה בדפדפן ללא כלי בנייה.

## פיתוח

לאחר הוספת/מחיקת/שינוי שם של קובץ מודול, הרץ:

```bash
node scripts/generate-dev-watch-list.js
```

זה מעדכן את `src/dev/devReload.js` כך שיעקוב אחרי כל הקבצים הרלוונטיים. לאחר מכן רענן את ההרחבה פעם אחת ב-`chrome://extensions` (רק אם `background.js`/`manifest.json` השתנו) — כל שינוי אחר מתעדכן אוטומטית בטאבים פתוחים תוך כשנייה.

## קרדיטים

- [pdf.js](https://github.com/mozilla/pdf.js) (Mozilla, Apache-2.0) — רינדור PDF.
- [jsPDF](https://github.com/parallax/jsPDF) (MIT) — ייצוא רשימת המילים ל-PDF.
- [Noto Sans Hebrew](https://fonts.google.com/noto/specimen/Noto+Sans+Hebrew) (OFL) — גופן עברי מוטמע בייצוא.
- התרגום משתמש ב-endpoint הציבורי הלא-רשמי של Google Translate (ללא API key). הוא אינו מתועד ועלול להשתנות או להיחסם ללא התראה — לשימוש אישי/לימודי.

## רישיון

[MIT](LICENSE)
