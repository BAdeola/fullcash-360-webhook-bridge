import sql from 'mssql';
import type { ComandaRecord } from '../models/fullcashInterface.js';

export class FullcashRepository {
    constructor(private pool: sql.ConnectionPool) {}

    async buscarPrimeiroSeqDia(): Promise<number | null> {
        try {
            const result = await this.pool.request().query(`
                SELECT TOP 1 seqdia 
                FROM controle_envio_fullcash
                ORDER BY seqdia ASC
            `);

            return result.recordset[0]?.seqdia ?? null;
        } catch (err) {
            console.error('Erro ao buscar seqdia:', err);
            throw err;
        }
    }

    async buscarComandasPorSeqDia(seqdia: number): Promise<ComandaRecord[]> {
        if (!Number.isInteger(seqdia) || seqdia <= 0) {
            throw new Error(`seqdia inválido fornecido ao repositório: ${seqdia}`);
        }

        try {
            const result = await this.pool.request()
                .input('seqParam', sql.Int, seqdia) 
                .query<ComandaRecord>(`
                    SELECT comanda 
                    FROM cadven 
                    WHERE sequencia_dia = @seqParam AND situac = 'EMITIDA' and valtot > 0
                `);

            return result.recordset;
        } catch (err) {
            console.error(`Erro ao buscar comandas para o seqdia ${seqdia}:`, err);
            throw err;
        }
    }

    async removerSeqDiaDaFila(seqdia: number): Promise<void> {
        if (!Number.isInteger(seqdia) || seqdia <= 0) {
            throw new Error(`Tentativa de remover seqdia inválido: ${seqdia}`);
        }

        try {
            await this.pool.request()
                .input('seqParam', sql.Int, seqdia)
                .query(`
                    DELETE FROM controle_envio_fullcash 
                    WHERE seqdia = @seqParam
                `);
                
            console.log(`--- SeqDia ${seqdia} removido da fila com sucesso ---`);
        } catch (err) {
            console.error(`Erro ao remover seqdia ${seqdia} da fila:`, err);
            throw err;
        }
    }

    async salvarLogEnvio(seqdia: number, status: 'SUCESSO' | 'ERRO', descricao?: string): Promise<void> {
        try {
            await this.pool.request()
                .input('seqParam', sql.Numeric(6, 0), seqdia)
                .input('statusParam', sql.VarChar(20), status)
                .input('descParam', sql.VarChar(sql.MAX), descricao ?? null)
                .query(`
                    INSERT INTO log_controle_envio_fullcash (data_hora, seqdia, status_envio, descricao)
                    VALUES (GETDATE(), @seqParam, @statusParam, @descParam)
                `);
        } catch (err) {
            console.error('⚠️ Falha ao salvar log de auditoria:', err);
        }
    }
}