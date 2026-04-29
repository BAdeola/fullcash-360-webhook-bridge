import sql from 'mssql';
import type { PagamentoDados } from '../models/paymentInterface.js';

export class PagamentoRepository {
    constructor(private pool: sql.ConnectionPool) {}

    async buscarTodosPagamentosDasComandas(comandas: number[]): Promise<Map<number, PagamentoDados[]>> {
        const pagamentosMap = new Map<number, PagamentoDados[]>();

        if (!Array.isArray(comandas) || comandas.length === 0) return pagamentosMap;

        if (comandas.length > 1000) {
            throw new Error(`Número de comandas excede o limite (Max: 1000). Recebido: ${comandas.length}`);
        }

        try {
            // Seguro: filtramos APENAS inteiros antes de interpolar
            const comandasLimpas = comandas
                .filter(c => Number.isInteger(c) && c > 0)
                .join(',');

            if (!comandasLimpas) return pagamentosMap;

            const result = await this.pool.request()
                .query<PagamentoDados & { comanda: number }>(`
                    SELECT p.comanda, p.valpgt, f.nompgt
                    FROM pgtven p
                    INNER JOIN forpgt f ON p.forpgt = f.codpgt
                    WHERE p.comanda IN (${comandasLimpas})
                `);

            result.recordset.forEach(row => {
                const lista = pagamentosMap.get(row.comanda) ?? [];
                lista.push({ valpgt: row.valpgt, nompgt: row.nompgt });
                pagamentosMap.set(row.comanda, lista);
            });

            return pagamentosMap;
        } catch (err) {
            console.error('Erro na busca de pagamentos:', err);
            throw err;
        }
    }
}