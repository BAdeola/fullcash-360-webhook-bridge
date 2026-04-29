export interface WebhookPayload {
    NomeSistema: string;
    Values: {
        NumeroCupom: string;
        CNPJEmitente: string;
        MeioPagamento: { 
            FormaPagamento: string; 
            Valor: number;
            Vencimento: string;
        }[];
        Data: string;
    }[];
}