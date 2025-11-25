import { Request, Response } from 'express';
import { ingestJuridicoData } from '../scripts/juridico/ingest-juridico-data';

export const juridicoIngestController = async (req: Request, res: Response) => {
    try {
        const { jsonData } = req.body;

        if (!jsonData) {
            return res.status(400).json({ error: "JSON de dados é obrigatório." });
        }

        const result = await ingestJuridicoData(jsonData);

        res.status(200).json({
            success: true,
            sessionId: result.sessionId,
            message: "Dados jurídicos ingeridos com sucesso."
        });

    } catch (error) {
        console.error("[Juridico Controller] Erro:", error);
        res.status(500).json({ 
            error: "Erro interno na ingestão jurídica.",
            details: error instanceof Error ? error.message : String(error)
        });
    }
};