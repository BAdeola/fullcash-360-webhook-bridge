import axios from 'axios';
import dotenv from 'dotenv';
import { poolPromise } from './config/database.js';
import { FullcashRepository } from './repositories/fullcash.repository.js';
import { PagamentoRepository } from './repositories/payment.repository.js';
import { WebhookService } from './services/json_maker.service.js';
import type sql from 'mssql';
import { CnpjRepository } from './repositories/cnpj.repository.js';
import { log } from 'console';

dotenv.config();

const URL_WEBHOOK = process.env.URL_WEBHOOK;

async function processarIntegracao(): Promise<number> {
    let pool: sql.ConnectionPool | null = null;
    let seqdiaAtual: number | null = null;
    let exitCode = 1;

    try {
        if (!URL_WEBHOOK) throw new Error('URL_WEBHOOK não configurada no .env');

        pool = await poolPromise; 
        const fullcashRepo = new FullcashRepository(pool); 
        const pagamentoRepo = new PagamentoRepository(pool);
        const cnpjRepo = new CnpjRepository(pool);
        const webhookService = new WebhookService(pagamentoRepo, cnpjRepo);

        console.log('--- Database Connected & Dependencies Injected ---');

        seqdiaAtual = await fullcashRepo.buscarPrimeiroSeqDia();

        if (!seqdiaAtual) {
            console.log('⚠️ Fila vazia: Nada para processar.');
            exitCode = 0;
        } else {
            console.log(`--- Processando SeqDia: ${seqdiaAtual} ---`);
            const comandas = await fullcashRepo.buscarComandasPorSeqDia(seqdiaAtual);

            if (comandas.length === 0) {
                console.log(`⚠️ SeqDia ${seqdiaAtual} sem comandas.`);
                await fullcashRepo.salvarLogEnvio(seqdiaAtual, 'ERRO', 'Nenhuma comanda encontrada no cadven para este seqdia');
                exitCode = 1;
            } else {
                const listaNumeros = comandas.map(c => c.comanda);
                const payload = await webhookService.montarPayloadOtimizado(listaNumeros);

                if (payload) {
                    console.log(`--- Enviando ${listaNumeros.length} comandas para o Webhook ---`);
                    const response = await axios.post(URL_WEBHOOK, payload);
                    
                    if (response.status === 200) {
                        console.log('✅ Webhook Success');
                        await fullcashRepo.salvarLogEnvio(seqdiaAtual, 'SUCESSO', 'Enviado com sucesso');
                        await fullcashRepo.removerSeqDiaDaFila(seqdiaAtual);
                        exitCode = 0;
                    } else {
                        await fullcashRepo.salvarLogEnvio(seqdiaAtual, 'ERRO', `Status inesperado da API: ${response.status}`);
                        exitCode = 1;
                    }
                }
            }
        }
    } catch (err) {
        let mensagemErro = 'Erro interno inesperado';

        if (axios.isAxiosError(err)) {
            const rawData = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            mensagemErro = rawData.substring(0, 200);
            console.error(`❌ Webhook Error:`, mensagemErro);
        } else if (err instanceof Error) {
            mensagemErro = err.message;
            console.error('❌ Internal Error:', mensagemErro);
        }

        if (seqdiaAtual && pool && pool.connected) {
            const fullcashRepo = new FullcashRepository(pool);
            await fullcashRepo.salvarLogEnvio(seqdiaAtual, 'ERRO', mensagemErro);
        }
        exitCode = 1;

    } finally {
        if (pool && pool.connected) {
            await pool.close();
            console.log('--- SQL Pool Closed ---');
        }
        return exitCode;
    }
}

processarIntegracao()
    .then(code => {
        console.log(`--- Process Finished with Code ${code} ---`);
        process.exit(code);
    })
    .catch(() => process.exit(1));