import agentService from "../service/agentService";

export const agentController = async (req: any, res: any) => {
    try {
        const { pergunta, jsonData, targetMonth } = req.body;

        console.log(targetMonth)


        if (!pergunta) {
            return res.status(400).json({
                erro: "É obrigatório enviar uma pergunta"
            });
        }

        if (!jsonData) {
            return res.status(400).json({
                erro: "É obrigatório enviar o jsonData"
            });
        }

        // Chama o agentService com os parâmetros recebidos do frontend
        const resposta = await agentService(pergunta, jsonData, targetMonth);
        console.log(resposta)


        res.json({ resposta });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            erro: "Erro ao processar sua pergunta"
        });
    }
}