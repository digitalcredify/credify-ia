
import { runRouterAgent } from "../agents/routerAgent";
import { runJuridicoAgent } from "../agents/juridicoAgent";
import { runPdfAgent } from "../agents/pdfAgent";
import { runJuridicoWebAgent } from "../agents/juridico/runJuridicoWebAgent";


export const juridicoAgentService = async (
    pergunta:string,
    document:string,
    name:string,
    onChunk?: (chunk: string) => void
) => {
    try {
        console.log("[Juridico Service] Iniciando processamento...")

        
        const routerDecision = await runRouterAgent(pergunta)

        switch(routerDecision.routerName){
            case 'web_agent':
                console.log("[Juridico Service] Roteando para Jurídico Web Agent")

                return await runJuridicoWebAgent(pergunta,document, name,onChunk)
            
            case 'pdf_agent':
                console.log('[Juridico Service] Roteando para Jurídico PDF Agent');
                const sessionId = `juridico_${Date.now()}`;
                return await runPdfAgent(sessionId, pergunta);
            
            default:
                console.log("[Juridico Service] Rota não reconhecida, usando Jurídico Web Agent como fallback")
                return await runJuridicoWebAgent(pergunta,name,document, onChunk)
        }

        
    } catch (error) {
        console.error("[Juridico Service] Erro:", error);
        throw error;
        
    }
}