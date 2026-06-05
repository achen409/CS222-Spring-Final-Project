import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { proposalLatexToPdf } from './pdfExport.js';
import { answerAgentQuestion, generateProposal, startAgentSession } from './proposalGenerator.js';

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    mode: process.env.LLM_API_KEY ? 'api-ready' : 'local-fallback'
  });
});

app.post('/api/agent/start', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.topic || '').trim()) {
      response.status(400).json({ error: 'Topic is required.' });
      return;
    }

    response.json(await startAgentSession(payload));
  } catch (error) {
    response.status(500).json({
      error: 'Agent start failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/agent/answer', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.answer || '').trim()) {
      response.status(400).json({ error: 'Answer is required.' });
      return;
    }

    response.json(await answerAgentQuestion(payload));
  } catch (error) {
    response.status(500).json({
      error: 'Answer integration failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/proposal', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.topic || '').trim()) {
      response.status(400).json({ error: 'Topic is required.' });
      return;
    }

    const result = await generateProposal(payload);
    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: 'Proposal generation failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/proposal/revision', async (request, response) => {
  try {
    const payload = request.body || {};

    if (!String(payload.topic || '').trim()) {
      response.status(400).json({ error: 'Topic is required.' });
      return;
    }
    if (!String(payload.currentLatex || '').trim()) {
      response.status(400).json({ error: 'Current LaTeX source is required to perform a revision.' });
      return;
    }
    if (!String(payload.revisionComments || '').trim()) {
      response.status(400).json({ error: 'Revision feedback text comments are required.' });
      return;
    }

    // Preserve original layout requirements so the checklist parser can match against them
    const originalRequirements = payload.requirements || `Proposal must include:
- Project title
- Abstract
- Motivation and gap
- Project goal
- Method or agent workflow
- Figure or diagram with caption
- Expected results
- Research milestones with timeline estimates
- Evaluation plan
- Risks and mitigation
- Resources or budget
- References, assumptions, or source notes`;

    // We build an augmented instructions context that appends the revision requirements
    // safely without breaking the JSON returning layout engine structure
    const updatedRequirements = `${originalRequirements}

[REVISION PHASE INSTRUCTIONS]
The user wants to revise their existing draft based on specific comments. 
You MUST preserve the overall document quality and previous sections while applying the new edits.

PREVIOUS LATEX DRAFT CONTENT TO EDIT:
${payload.currentLatex}

USER REVISION INSTRUCTIONS / CORRECTIONS TO IMPLEMENT:
${payload.revisionComments}

Ensure you output the updated version inside the "proposalLatex" JSON field property, 
and update the "complianceMatrix" and "evaluationReport" elements to reflect the revised document state.`;

    // Execute the unified generator with the clean data structure
    const result = await generateProposal({
      ...payload,
      requirements: updatedRequirements
    });

    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: 'Proposal revision update failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.post('/api/export/pdf', async (request, response) => {
  try {
    const payload = request.body || {};
    const latex = String(payload.proposalLatex || '').trim();

    if (!latex) {
      response.status(400).json({ error: 'proposalLatex is required.' });
      return;
    }

    const title = String(payload.title || 'proposal').trim();
    const pdf = await proposalLatexToPdf(latex, title);

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', 'attachment; filename="proposal.pdf"');
    response.send(pdf);
  } catch (error) {
    response.status(500).json({
      error: 'PDF export failed.',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

app.listen(port, () => {
  console.log(`Proposal API listening on http://127.0.0.1:${port}`);
});
