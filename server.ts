import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint for Legal AI Assistance
app.post('/api/gemini/assist', async (req, res) => {
  try {
    const { action, caseDetails, prompt, language = 'hi-en' } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please check Settings > Secrets.',
      });
    }

    let systemInstruction = `You are an expert Indian Legal Advisor & Judicial Practice Assistant working with Advocate Anis Nagori (Mobile: 9887642984).
You possess deep expertise in Indian criminal and civil law, Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), Code of Criminal Procedure (CrPC), Bharatiya Nagarik Suraksha Sanhita (BNSS), Indian Evidence Act / Bharatiya Sakshya Adhiniyam (BSA), Negotiable Instruments Act (Section 138), Juvenile Justice Act (e.g. Vidhi Se Sangrashrat Balak / CCL matters), and District & Sessions Court (DJ/ADJ/ACJM) procedure in India.

Tone: Professional, authoritative, practical, and highly useful for an advocate appearing in court.
Support bilingual output (Hindi/Hinglish/English) as requested by Indian court advocates.
Structure output with clear headings, statutory references, key arguments for Bahas (बहस), cross-examination points, landmark Supreme Court/High Court case citations, and procedural next steps.`;

    let userPrompt = '';

    if (action === 'case_strategy') {
      userPrompt = `Analyze the following case from Advocate Anis Nagori's Cause List and provide detailed courtroom hearing strategy:
Case Details:
- Court: ${caseDetails?.court || 'District Court'}
- Case Number: ${caseDetails?.caseNo || 'N/A'}
- Parties: ${caseDetails?.party || 'N/A'}
- Statutory Section: ${caseDetails?.section || 'N/A'}
- Current Hearing Stage: ${caseDetails?.stage || 'BAHAS / APEAL'}
- Previous Date: ${caseDetails?.previousDate || 'N/A'}
- Next Date: ${caseDetails?.nextDate || 'N/A'}
- Advocate Notes: ${caseDetails?.notes || 'None'}

Please provide:
1. Legal Analysis of the Sections/Offences charged (including bailable/non-bailable status, triable court, punishment).
2. Key Arguments for BAHAS (बहस के मजबूत बिंदु) from defense advocate's perspective.
3. Crucial Supreme Court & High Court Precedents (न्यायिक दृष्टांत) relevant to this stage.
4. Strategic Questions for Witness Cross-Examination (गवाहों से जिरह के सवाल) if applicable.
5. Immediate Courtroom Procedural Actions & Applications to submit today.`;
    } else if (action === 'draft_application') {
      userPrompt = `Draft a formal legal court application for Indian District Court (DJ/ADJ/ACJM) for the following:
Type of Application: ${req.body.applicationType || 'Hazri Mafi / Exemption Application (Section 317/115 CrPC)'}
Case Details:
- Court: ${caseDetails?.court || 'Court of District & Sessions Judge'}
- Case Number: ${caseDetails?.caseNo || 'Special Case'}
- Parties: ${caseDetails?.party || 'Accused v/s State'}
- Section: ${caseDetails?.section || 'Under relevant section'}
- Advocate Name: Anis Nagori Advocate (Mob: 9887642984)
- Specific Reason/Grounds: ${prompt || 'Urgent medical exigency / out of station with counsel permission'}

Provide both formal English and Hindi draft format ready to print and submit to the Hon'ble Judge.`;
    } else if (action === 'notice_whatsapp') {
      userPrompt = `Generate a polite, clear, and professional Hindi & English WhatsApp/SMS hearing notification message that Advocate Anis Nagori can send to the client/party:
Case Details:
- Case No: ${caseDetails?.caseNo || 'Case'}
- Court: ${caseDetails?.court || 'District Court'}
- Parties: ${caseDetails?.party}
- Stage: ${caseDetails?.stage}
- Next Date of Hearing: ${caseDetails?.nextDate || 'Upcoming date'}
- Instructions: Mention documents needed, reporting time (10:00 AM), and contact details: Anis Nagori Advocate, Mobile: 9887642984.`;
    } else if (action === 'extract_case') {
      userPrompt = `Extract structured legal case information from this court notice, order sheet, or diary entry text:
"${prompt}"

Return the analysis along with extracted fields:
- Court Name (e.g. DJ, ADJ 1, ACJM, CJM, High Court)
- Case No
- Parties (Petitioner/Appellant vs Respondent/State)
- Relevant Legal Sections (e.g. 302 IPC, 483 IPC, 138 NI Act, etc.)
- Hearing Stage (e.g. BAHAS, APEAL, EVIDENCE, FRAMING OF CHARGES, BAIL)
- Previous Date and Next Hearing Date`;
    } else {
      userPrompt = prompt || `Provide legal research advice for advocate daily practice.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      result: response.text,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process AI legal assistance request.',
    });
  }
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Advocate Case Diary Server running on http://localhost:${PORT}`);
});
