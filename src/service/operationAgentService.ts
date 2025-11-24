/**
 * @fileoverview 
 * este arquivo atua como um roteador inteligente para o Operation Agent
 * Web Agent: acionado quando é feita perguntas sobre dados operacionais
 * PDF Agent: acionado quando o usuário pede explicitamente por um pdf
 */

import { runRouterAgent } from "../agents/routerAgent";
import { runPdfAgent } from "../agents/pdfAgent";
import { runOperationWebAgent } from "../agents/operations/operationWebAgent";

export const operationAgentService = async (
    pergunta: string,
    jsonData: any,
    startDate: string,
    endDate: string,
    startHour: any,
    endHour: any,
    onChunk?: (chunk: string) => void
) => {
    try {
        console.log("[Operation Agent Service] Iniciando processamento...");
        console.log(`[Operation Agent Service] Pergunta: "${pergunta}"`);
        console.log(`[Operation Agent Service] Range: ${startDate} a ${endDate}`);
        if (startHour !== undefined && endHour !== undefined) {
            console.log(`[Operation Agent Service] Horas: ${startHour}h a ${endHour}h`);
        }

        // Classifica a intenção do usuário
        const routeDecision = await runRouterAgent(pergunta);

        switch (routeDecision.routerName) {
            case 'web_agent':
                console.log("[Operation Agent Service] Roteando para Operation Web Agent");
                return await runOperationWebAgent(pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk);

            case "pdf_agent":
                console.log("[Operation Agent Service] Roteando para PDF Agent");
                // Usa uma sessionId baseada no range de datas para o PDF Agent
                const sessionId = `operation_${startDate}_${endDate}`;
                return await runPdfAgent(sessionId, pergunta);

            default:
                console.log("[Operation Agent Service] Rota não reconhecida, usando Web Agent como fallback");
                return await runOperationWebAgent(pergunta, jsonData, startDate, endDate, startHour, endHour, onChunk);
        }

    } catch (error) {
        console.error("[Operation Agent Service] Erro:", error);
        throw error;
    }
};
