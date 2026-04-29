import { PagamentoRepository } from '../repositories/payment.repository.js';
import { CnpjRepository } from '../repositories/cnpj.repository.js';

export class WebhookService {
    constructor(
        private pagamentoRepo: PagamentoRepository,
        private cnpjRepo: CnpjRepository
    ) {}

    async montarPayloadOtimizado(comandas: number[]): Promise<any> {
        if (comandas.length === 0) return null;

        try {
            let cnpjFinal: string;
            
            if (process.env.IS_HOMOLOGACAO === "1") {
                cnpjFinal = process.env.CNPJ_HOMOLOGACAO ?? "";
                console.log(`--- Modo Homologação: Usando CNPJ do .env [${cnpjFinal}] ---`);
            } else {
                const cnpjBanco = await this.cnpjRepo.buscarCnpjDaLoja();
                if (!cnpjBanco) throw new Error("CNPJ não encontrado na tabela cadloj!");
                cnpjFinal = cnpjBanco;
                console.log(`--- Modo Produção: Usando CNPJ do Banco [${cnpjFinal}] ---`);
            }

            const todosPagamentosMap = await this.pagamentoRepo.buscarTodosPagamentosDasComandas(comandas);

            const values = comandas.map(comanda => {
                const pagamentosDaComanda = todosPagamentosMap.get(comanda) ?? [];

                return {
                    NumeroCupom: `COM-${comanda}`,
                    CNPJEmitente: cnpjFinal,
                    MeioPagamento: pagamentosDaComanda.map(pgto => ({
                        FormaPagamento: pgto.nompgt,
                        Valor: pgto.valpgt,
                        Vencimento: new Date().toISOString()
                    })),
                    Data: new Date().toISOString()
                };
            });

            return {
                NomeSistema: "Integrador_COBOL_Node",
                Values: values
            };
        } catch (err) {
            console.error('Erro ao montar payload:', err);
            throw err;
        }
    }
}