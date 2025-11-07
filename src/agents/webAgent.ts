import { ensureMongoConnection } from "../config";
import { checkIfDataExists, createVectorIndex, ingestData } from "../scripts/ingest-data";
import { generateResponse } from "../planning";
import { isCurrentMonth } from "../utils/dateUtils";  

export const runWebAgent = async (pergunta: string, jsonData: any, targetMonth: string) => {
    
    try {
        await ensureMongoConnection();
        console.log("[Web Agent] MongoDB pronto para uso.");
        
        
        const isCurrentMonthFlag = isCurrentMonth(targetMonth);
        
        if (isCurrentMonthFlag) {
            console.log(`[Web Agent] ⚠️ Mês atual detectado (${targetMonth})`);
            console.log(`[Web Agent] 🔄 Reingerindo dados (dados dinâmicos)...`);
            
            await ingestData(jsonData, targetMonth);
            await createVectorIndex();
            
            console.log(`[Web Agent] ✅ Reingestão concluída`);
            
        } else {
            const dataExists = await checkIfDataExists(targetMonth);
            
            if (!dataExists) {
                console.log(`[Web Agent] Iniciando ingestão para ${targetMonth}...`);
                await ingestData(jsonData, targetMonth);
                await createVectorIndex();
            } else {
                console.log(`[Web Agent] Dados para ${targetMonth} já existem.`);
            }
        }

        const response = await generateResponse(targetMonth, pergunta);
        return response;

    } catch (error) {
        console.error("[Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro.";
    }
}
