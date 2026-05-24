import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { WELLS_DATA, SPE_KNOWLEDGE_BASE } from "../../../../lib/oilfieldData";

// Initialize Gemini Client with correct constructor parameters & User-Agent as required by skill guidelines.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

export async function POST(req: NextRequest) {
  try {
    const { prompt, chatHistory, wellContextId, reportType } = await req.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        text: "### API Configuration Notice\n\nNo `GEMINI_API_KEY` was detected in the environment. Please configure your API key in **Settings > Secrets** to enable server-side advanced AI analytics. \n\n*Note: Our mathematical calculation engine and physics simulators remain fully active offline!*",
        isOfflineMode: true
      });
    }

    // Capture context details for grounding
    const selectedWell = WELLS_DATA.find(w => w.id === wellContextId);
    
    // Construct rich technical RAG knowledge payload
    const wellBriefs = WELLS_DATA.map(w => `
Well Name: ${w.name}
Status: ${w.status}, Lift Type: ${w.liftType}
Production Metrics: Liquid Rate: ${w.liquidRate} bpd, Oil Rate: ${w.oilRate} bopd, Water Cut: ${w.waterCut}%, GOR: ${w.gor} scf/stb
Calculated KPI: Productivity Index (PI): ${w.productivityIndex} stb/d/psi, Skin Factor: ${w.skinFactor}
Well Reservoir Pressure: ${w.reservoirPressure} psi, Bubble Point: ${w.bubblePointPressure} psi
Diagnostic Comments: ${w.diagnosticComments}
    `).join('\n\n');

    const paperBriefs = SPE_KNOWLEDGE_BASE.map(p => `
Paper Code: ${p.code}
Title: ${p.title}
Summary: ${p.summary}
Best Practice Guidelines:
${p.guidelines.map(g => `- ${g}`).join('\n')}
    `).join('\n\n');

    // System instructions configuring the LLM as our master Petroleum Production Coordinator Agent
    const systemInstruction = `
You are the "Senior Petroleum Production Optimization Coordinator AI Agent", managing a team of specialized analytical sub-agents:
1. Reservoir Engineer Agent
2. Well Diagnostics Agent
3. Economic Analyst Agent
4. Artificial Lift Specialist
5. Surveillance Monitoring Agent

Your task is to provide expert oilfield diagnostics, operations troubleshooting, nodal analysis support, and automated technical reporting matching professional SPE (Society of Petroleum Engineers) standards.

OPERATIONAL WELL DATA CONTEXT:
${wellBriefs}

SPE RAG REFERENCE STANDARD MANUALS:
${paperBriefs}

INSTRUCTIONS FOR GENERATING OUTCOMES:
- Structure your output elegantly in pristine professional markdown.
- Utilize bullet points, highlighting, and tabulations for data heavy statements.
- Avoid low-quality words like "flawless", "gorgeous", "stellar".
- Ensure statements are rooted in actual petroleum engineering thermodynamics, vertical lift performance (VLP), inflow performance relationships (IPR), Vogel's correction, and economic Net Present Value (NPV).
- If the user selects a specific well (Currently selected: ${selectedWell ? selectedWell.name : 'All Wells'}), prioritize analysis of this well.
- When explaining causes of decline, relate directly back to Skin Factor (formation damage), water breakthroughs (aquifer influx), or gas slugging (critical drawdown).
- When asked to write report (reportType: ${reportType || 'None'}), provide a highly detailed, executive engineers report with chronological analysis, operational parameters, diagnostics, corrective action roadmap with specific recommendations, and complete economic forecasts (ROI/NPV).
`;

    // Package chat history for continuity
    const formattedContents: any[] = [];
    
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((msg: any) => {
        formattedContents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }

    // Add current user prompt
    let fullUserQuery = prompt;
    if (reportType && reportType !== 'None') {
      fullUserQuery = `Please generate an executive ${reportType} based on our reservoir, well test metrics, and economic parameters. Ensure all sub-agent inputs are aggregated and represented.`;
    } else if (selectedWell) {
      fullUserQuery = `[Context Well: ${selectedWell.name}, Lift: ${selectedWell.liftType}, Liquid Rate: ${selectedWell.liquidRate} bpd, Water Cut: ${selectedWell.waterCut}%] - User Question: ${prompt}`;
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: fullUserQuery }]
    });

    // Make API request with the selected model
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // low temperature for precise factual calculations
      }
    });

    const outputText = response.text || "No response text received from the Gemini Engine.";

    return NextResponse.json({
      text: outputText,
      groundedWell: selectedWell ? selectedWell.id : null
    });

  } catch (error: any) {
    console.error("Gemini API server failure: ", error);
    return NextResponse.json({
      text: `### Senior Pipeline Diagnostic Notice\n\nFailed to fully resolve AI Agent network handshake. \n\n**Error context:** \`\`\`${error?.message || error}\`\`\`\n\n*Note: Our mathematical calculation engine and physics simulators remain fully active offline on the dashboard!*`,
      error: true
    }, { status: 500 });
  }
}
