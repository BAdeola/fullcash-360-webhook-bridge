import sql from 'mssql';

export class CnpjRepository {
    constructor(private pool: sql.ConnectionPool) {}

    async buscarCnpjDaLoja(): Promise<string | null> {
        try {
            // Buscando o CNPJ da tabela cadloj (geralmente só existe uma linha de configuração da loja)
            const result = await this.pool.request().query<{ cnpj: string }>(`
                SELECT TOP 1 cnpj 
                FROM cadloj
            `);

            if (result.recordset.length === 0) return null;
            
            return result.recordset[0]?.cnpj?.replace(/\D/g, '') ?? null;
        } catch (err) {
            console.error("Erro ao buscar CNPJ na cadloj:", err);
            throw err;
        }
    }
}