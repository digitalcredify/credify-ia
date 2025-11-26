

import { generateOperationResponse } from "../../plannings/operation/operationPlanning";
import { checkIfRangeExists, ingestOperationData } from "../../scripts/operations/ingest-operation-data";


export const runOperationWebAgent = async (
    pergunta: string,
    jsonData: any,
    startDate: string,
    endDate: string,
    startHour?: any,
    endHour?: any,
    onChunk?: (chunk: string) => void
) => {
    try {
        console.log("[Operation Web Agent] Iniciando processamento com Qdrant...");
        console.log(`[Operation Web Agent] Range solicitado: ${startDate} a ${endDate}`);
        if (startHour !== undefined && endHour !== undefined) {
            console.log(`[Operation Web Agent] Filtro de horas: ${startHour}h a ${endHour}h`);
        }

        const rangeExists = await checkIfRangeExists(startDate, endDate,startHour,endHour);

        if (rangeExists) {
            console.log(`[Operation Web Agent] ✅ Range já existe no Qdrant, usando dados existentes.`);
        } else {
            console.log(`[Operation Web Agent] 🔄 Range não encontrado, iniciando ingestão...`);
            await ingestOperationData(jsonData, startDate, endDate,startHour,endHour);
            console.log(`[Operation Web Agent] ✅ Ingestão concluída`);
        }

        const response = await generateOperationResponse(startDate, endDate, startHour, endHour, pergunta, onChunk);
        return response;

    } catch (error) {
        console.error("[Operation Web Agent] Erro fatal:", error);
        return "Desculpe, ocorreu um erro ao processar sua solicitação.";
    }
};
