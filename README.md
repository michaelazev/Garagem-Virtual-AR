# 🚗 Garagem Virtual AR

CRUD de veículos em **Realidade Aumentada**, com um cenário 3D navegável (a concessionária)
onde é possível caminhar, selecionar veículos e realizar test drives.

Projeto acadêmico que integra **AR.js** + **A-Frame** a um backend REST simulado com
**JSON Server**, demonstrando as operações de CRUD mapeadas para os verbos HTTP reais,
com persistência local via **LocalStorage**.

---

## Sobre o projeto

A aplicação funciona em dois modos:

- **Modo AR** — aponte a câmera do celular ou computador para o marcador impresso e a
  concessionária aparece sobreposta ao ambiente real, com todos os veículos cadastrados.
- **Modo Showroom** — um cenário 3D completo e navegável (avenida, concessionária,
  estacionamento, rotatória), onde o usuário anda livremente, seleciona carros e testa o
  sistema de test drive.

Toda operação de cadastro, edição ou remoção de veículos é refletida em tempo real na cena
3D e é registrada como uma requisição HTTP real contra a API.

## Funcionalidades

- **CRUD completo** de veículos (`POST`, `GET`, `PUT`, `PATCH`, `DELETE`) via JSON Server
- **Persistência offline** — todos os dados são espelhados no LocalStorage e a aplicação
  continua funcional sem conexão com a API
- **Reconhecimento de marcador AR** (código matricial, mais robusto que marcadores de imagem)
- **Modelos 3D proceduais** diferenciados por categoria do veículo (hatch, sedã, caminhonete, SUV)
- **Test drive animado** — o veículo selecionado percorre uma trajetória circular
- **Cenário 3D navegável** com movimentação por teclado (desktop) ou joystick virtual (mobile)
- **Interação em RA** por clique, *gaze* (cursor com tempo de fixação) e botões virtuais 3D
- **Painel de controle** com formulário de cadastro, lista de veículos e log de requisições HTTP
- **Acesso remoto via QR Code**, com suporte a túnel HTTPS para testes em dispositivos móveis

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Realidade Aumentada | [AR.js](https://ar-js-org.github.io/AR.js-Docs/) 3.4.5 |
| Cena 3D / WebXR | [A-Frame](https://aframe.io/) 1.3.0 |
| Backend simulado | [JSON Server](https://github.com/typicode/json-server) 0.17.4 |
| Persistência offline | LocalStorage (API do navegador) |
| Servidor de desenvolvimento | live-server |

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- Um navegador atualizado com suporte a WebGL (Chrome, Safari ou Edge recomendados)

## Instalação

```bash
git clone https://github.com/michaelazev/Garagem-Virtual-AR.git
cd Garagem-Virtual-AR
npm install
```

## Executando o projeto

| Objetivo | Comando | Endereço |
|---|---|---|
| Frontend + API juntos | `npm start` | Frontend: `http://localhost:8080` · API: `http://localhost:3001` |
| Somente a API | `npm run api` | `http://localhost:3001/vehicles` |
| Somente o frontend | `npm run front` | `http://localhost:8080` |
| Frontend em HTTPS (necessário para câmera em dispositivos móveis) | `npm run front:https` | `https://localhost:8443` |
| API + frontend em HTTPS | `npm run dev:https` | — |
| Link público para acesso via celular | `npm run tunnel` (com `npm start` já em execução) | link `https://*.trycloudflare.com` + QR Code |
| Gerar QR Code de acesso | `npm run qr` | QR para a URL informada |
| Regerar o marcador de RA | `npm run marker` | `assets/marcador-garagem.png` |

A API e o frontend são executados em portas independentes (`3001` e `8080` respectivamente),
simultaneamente através do `concurrently`.

---

### Acesso via dispositivo móvel

A câmera do navegador só é liberada em conexões **HTTPS** (ou `localhost`). Para testar o
modo AR em um celular, gere um link público com certificado válido:

```bash
# terminal 1
npm start

# terminal 2
npm run tunnel
```

O comando `tunnel` imprime um link público e um QR Code para leitura direta pela câmera do
celular. Nesse cenário, o CRUD opera via LocalStorage, já que a API não é exposta publicamente.

---

## Controles (modo Showroom)

| Ação | Comando |
|---|---|
| Mover | `W A S D` ou setas direcionais (`Shift` para correr) |
| Olhar ao redor | Arrastar o mouse ou o dedo na tela |
| Selecionar um veículo | Clicar sobre ele |
| Fechar seleção | Clicar fora de qualquer veículo |
| Iniciar test drive | Selecionar um veículo → botão **Test drive** no painel |

---

## CRUD e verbos HTTP

Cada ação do painel corresponde a uma requisição HTTP real contra o JSON Server, refletida
imediatamente na cena 3D:

| Ação | Verbo HTTP | Efeito na cena |
|---|---|---|
| Criar | `POST /vehicles` | Novo veículo entra no pátio com animação |
| Listar | `GET /vehicles` | Pátio, lista e cartazes são renderizados |
| Atualizar | `PUT /vehicles/:id` | Veículo gira em destaque; cartaz é atualizado |
| Atualizar parcialmente | `PATCH /vehicles/:id` | Atualização rápida de preço/potência |
| Remover | `DELETE /vehicles/:id` | Veículo sai da cena e do armazenamento |

---

## Arquitetura do projeto

```
index.html                  estrutura da cena, painel e interface auxiliar
css/style.css                estilos da aplicação

js/
├── boot.js                  seleciona o modo (AR ou Showroom) e injeta a cena
├── config.js                configurações globais (URLs, mapa, jogador, test drive)
├── api.js                   camada de dados: CRUD via API + fallback em LocalStorage
├── data/
│   ├── catalog.js           catálogo de marcas, modelos, categorias e cores
│   └── mock.js              geração de veículos aleatórios
├── components/
│   ├── vehicle.js           modelo 3D procedural por categoria
│   ├── virtual-button.js     botão virtual 3D
│   ├── player-controls.js    movimentação do jogador
│   └── touch-joystick.js     joystick virtual (mobile)
├── scene/
│   ├── city.js               construção do cenário (avenida, concessionária, estacionamento)
│   ├── lineup.js              vitrine de veículos, seleção e cartazes
│   └── test-drive.js          sistema de test drive
└── ui/
    └── panel.js               painel de controle (formulário, lista, log de requisições)

scripts/
├── seed.js                   popula o banco de dados com veículos de exemplo
├── gen-marker.js              gera a imagem do marcador de RA
├── https-config.js            certificado autoassinado para desenvolvimento local
├── qr.js                      geração de QR Code de acesso
└── tunnel.js                  túnel público para testes em dispositivos móveis

db.json                       banco de dados do JSON Server
```
---

## Licença

Distribuído sob a licença MIT.
