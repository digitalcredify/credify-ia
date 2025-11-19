import { ingestDataOperation } from "../../scripts/operations/ingest-data-operations";

export const runOperationsChatBotAgent = async (
    pergunta:string,
    json:any,
    startDate:any,
    endDate:any,
    startHour:any, 
    endHour:any,
    onChunk?: (chunk: string) => void  
) => {

    try {

        console.log("[Operations CB] Conectado!");

        await ingestDataOperation()


        





        
    } catch (error) {
        
    }

}