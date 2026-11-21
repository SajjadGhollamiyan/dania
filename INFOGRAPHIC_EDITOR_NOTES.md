# Dania Infographic Editor — Phase 1

This update extends the existing infographic response inside the AI assistant.

## Included
- Inline editing of infographic title, subtitle, section icons, headings, descriptions, statistics, and takeaway.
- Add and remove section cards (up to 8 cards).
- Drag-and-drop reordering of section cards.
- Four accent palettes, including Dania purple, and two card layouts.
- PNG and PDF export using the html2canvas and jsPDF libraries already loaded by app.html.
- SVG-container export with an embedded PNG image to preserve visual fidelity. This SVG export is not a vector-editable document; edits should be made in the Dania editor before exporting.

## Deployment notes
- No new third-party dependency was added.
- Existing `dania-ai` Supabase Edge Function and OpenAI request flow were not changed.
- Existing app entry point and authentication flow were not changed.
- Deploy the root contents of `dania-ai-test` as the `ai-test` branch project. The nested `dania_work` folder is an existing duplicate/work copy and was not used as the deployment source.

## Manual QA checklist
1. Sign in to Dania and open the AI assistant.
2. Select Infographic and generate a topic.
3. Edit title, subtitle, heading, body text, and statistic in place.
4. Change palette and layout.
5. Add, remove, and drag cards to reorder.
6. Download PNG and verify Persian text and logo.
7. Download PDF and verify page dimensions and text rendering.
8. Download SVG and verify it opens in a browser or vector viewer (the image is embedded as PNG).
