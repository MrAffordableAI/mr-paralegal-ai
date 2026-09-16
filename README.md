# Mr. Paralegal AI

Decision-support desk for court papers, intake, drafts, and evidence-first reports — **all 50 U.S. states plus D.C.**

**This is not a lawyer, not a law firm, and not legal advice.** It does not create an attorney-client relationship. Confirm every statute, form, fee, and deadline with official sources or a licensed attorney in the governing jurisdiction.

| Use | Name |
| --- | --- |
| App / brand | **Mr. Paralegal** |
| Repository | `mr-paralegal-ai` |
| GitHub | [MrAffordableAI/mr-paralegal-ai](https://github.com/MrAffordableAI/mr-paralegal-ai) |

See [LEGAL.md](LEGAL.md).

## What it does

- Photograph or upload judgments, orders, letters, summonses, and tickets
- Classify court orders separately from parking tickets
- Flag when the paper names a different state than Settings
- Run an evidence-first **Decision report** with safety gates (jurisdiction, verified authority, deadlines)
- Draft demand letters, intake memos, and checklists labeled **DRAFT FOR ATTORNEY REVIEW**
- Export Word and PDF

Papers stay in **your browser** (`localStorage`). Model calls run **on the server** with `XAI_API_KEY` — the key is never sent to the client.

## Quick start

```bash
git clone https://github.com/MrAffordableAI/mr-paralegal-ai.git
cd mr-paralegal-ai
npm install
export XAI_API_KEY=your_key   # server-side only; from https://console.x.ai/
npm run dev
```

Open the URL the app prints (this workspace uses port 8080).

Without a key, organization and checklists still work; paper review and Decide’s model memo will report that the model is unavailable. Law is still withheld until jurisdiction is confirmed and a controlling section is retrieved.

## Privacy

- Matter files, papers, and settings live in the browser
- Do not put sealed, highly sensitive, or privileged material into a browser app unless you have a security review
- Each visitor to a public site gets their own empty desk — they do not see your papers

## License

MIT. See `LICENSE`. Using the software does not make the authors your lawyers.
