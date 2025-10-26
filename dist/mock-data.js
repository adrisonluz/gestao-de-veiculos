"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockFinancials = exports.mockClients = void 0;
exports.mockClients = [
    {
        id: '1',
        name: 'João da Silva',
        address: 'Rua das Flores, 123, São Paulo, SP',
        cpf: '123.456.789-00',
        billingType: 'automatic',
        vehicles: [
            { id: 'v1', plate: 'ABC-1234', model: 'Toyota Corolla', value: 75000, images: ['vehicle-1'], clientId: '1' },
            { id: 'v2', plate: 'DEF-5678', model: 'Honda Civic', value: 80000, images: ['vehicle-2'], clientId: '1' },
        ],
    },
    {
        id: '2',
        name: 'Maria Oliveira',
        address: 'Avenida Brasil, 456, Rio de Janeiro, RJ',
        cpf: '987.654.321-11',
        billingType: 'manual',
        vehicles: [
            { id: 'v3', plate: 'GHI-9012', model: 'Ford Ranger', value: 120000, images: ['vehicle-4'], clientId: '2' },
        ],
    },
    {
        id: '3',
        name: 'Carlos Pereira',
        address: 'Praça da Sé, 789, Salvador, BA',
        cpf: '111.222.333-44',
        billingType: 'automatic',
        vehicles: [
            { id: 'v4', plate: 'JKL-3456', model: 'Chevrolet Onix', value: 55000, images: ['vehicle-3'], clientId: '3' },
        ],
    },
];
exports.mockFinancials = [
    { id: 'f1', date: new Date(2023, 10, 15), description: 'Mensalidade - Nov/23', amount: 150.00, clientId: '1', vehiclePlate: 'ABC-1234' },
    { id: 'f2', date: new Date(2023, 10, 20), description: 'Taxa de Instalação', amount: 300.00, clientId: '2', vehiclePlate: 'GHI-9012' },
    { id: 'f3', date: new Date(2023, 11, 15), description: 'Mensalidade - Dez/23', amount: 150.00, clientId: '1', vehiclePlate: 'ABC-1234' },
    { id: 'f4', date: new Date(2023, 11, 15), description: 'Mensalidade - Dez/23', amount: 120.00, clientId: '1', vehiclePlate: 'DEF-5678' },
    { id: 'f5', date: new Date(2024, 0, 15), description: 'Mensalidade - Jan/24', amount: 150.00, clientId: '1', vehiclePlate: 'ABC-1234' },
    { id: 'f6', date: new Date(2024, 0, 18), description: 'Pagamento Recebido', amount: -250.00, clientId: '2' },
    { id: 'f7', date: new Date(2024, 0, 25), description: 'Mensalidade - Jan/24', amount: 180.00, clientId: '3', vehiclePlate: 'JKL-3456' },
];
