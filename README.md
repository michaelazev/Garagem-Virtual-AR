# Garagem Virtual AR — CRUD + Realidade Aumentada + cenário 3D

CRUD de veículos com **AR.js** (marcador customizado da concessionária) e um **cenário 3D
navegável** onde o jogador anda pela cidade, seleciona carros e faz **test drive**.
Backend: **JSON Server 0.17.4**. Dados também espelhados no **LocalStorage** (fallback offline).

---

## Como rodar

```bash
npm install
```

| Objetivo | Comando | Onde acessar |
|---|---|---|
| **Frontend + API juntos** | `npm start` | Frontend: `http://localhost:8080` · API: `http://localhost:3001` |
| **Só a API** (JSON Server 0.17.4) | `npm run api` | `http://localhost:3001/vehicles` |
| **Só o Frontend** | `npm run front` | `http://localhost:8080` |
| Frontend em **HTTPS** (testar AR no celular) | `npm run front:https` | `https://localhost:8443` ou `https://SEU_IP:8443` |
| API + Frontend HTTPS juntos | `npm run dev:https` | — |
| **Celular via link público** (sem aviso) | `npm run tunnel` (com `npm start` rodando) | link `https://…trycloudflare.com` + QR |
| **QR Code** (rede local) | `npm run qr` | QR de `https://SEU_IP:8443/` |
| Regerar o marcador | `npm run marker` | `assets/marcador-garagem.png` |

- API e Frontend rodam em **portas separadas** (`3001` e `8080`), em processos simultâneos via `concurrently`.
- O `npm run front` abre o navegador automaticamente.
- Se aparecer `EADDRINUSE`, libere as portas:
  ```bash
  powershell -Command "Get-NetTCPConnection -LocalPort 3001,8080,8443 -State Listen -EA SilentlyContinue | Select -Expand OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"
  ```

---

## Modos

| URL | Modo | Descrição |
|---|---|---|
| `http://localhost:8080/` | **AR** | Webcam + **marcador GARAGEM VIRTUAL**. Atende o requisito de AR.js. |
| `http://localhost:8080/?preview=1` | **Showroom** | Cidade 3D navegável (sem câmera). Para testar/apresentar o CRUD + test drive. |

### Marcador (código matricial 3×3, não usa mais o Hiro)
- `<a-marker type="barcode" value="5">` + `matrixCodeType: 3x3` — um **código quadriculado
  (tipo QR)**, que lê bem melhor no celular do que um marcador de imagem.
- Imagem para imprimir/mostrar: [`assets/marcador-garagem.png`](assets/marcador-garagem.png).
  Página pronta para impressão: `http://localhost:8080/imprimir.html`.
- Regenerar: `npm run marker` (a partir de `assets/_src-barcode.png`).

### Abrir no celular

A câmera do celular **só liga em HTTPS**. Duas formas:

**A) Túnel público (recomendado — sem aviso de certificado, sem firewall):**
```
Terminal 1:  npm start
Terminal 2:  npm run tunnel
```
`npm run tunnel` imprime um link `https://xxxxx.trycloudflare.com` + um **QR Code**.
Escaneie com a câmera do celular → abre direto (certificado válido) → permita a câmera →
aponte para o marcador. (No celular o CRUD roda pelo **LocalStorage**, sem a API.)

**B) Rede local com certificado autoassinado:**
```
Terminal 1:  npm run dev:https      (API + site HTTPS)
Terminal 2:  npm run qr             (QR de https://SEU_IP:8443/)
```
Ao abrir no celular vai aparecer **"Sua conexão não é particular" / `ERR_CERT_AUTHORITY_INVALID`** —
isso é **normal** (certificado autoassinado). Toque em **Avançado → Continuar para o site**.
Se o Windows perguntar, **permita o Node.js em redes privadas**.

No PC via `http://localhost:8080/` a câmera funciona sem nada disso.

---

## Controles (modo Showroom)

| Ação | Como |
|---|---|
| Andar | **W A S D** ou **setas** (Shift = correr) |
| Olhar | **arrastar o mouse** |
| Selecionar um veículo | **clicar** nele (abre o painel da concessionária) |
| Fechar seleção | **clicar fora** de um veículo |
| Test drive | selecionar um veículo → botão **▶ Test drive** no painel |
| Ações rápidas | dock no canto (☰ painel · + novo · ⚂ popular) |

O painel de controle **só aparece quando um veículo é selecionado** (ou "+ Novo veículo").
Ao clicar em outro carro, o painel troca para os dados dele.

---

## Como o enunciado é atendido

### CRUD ↔ Verbo HTTP ↔ Efeito na cena

| Ação | Verbo (real, JSON Server :3001) | Efeito no ambiente |
|------|--------------------------------|--------------------|
| **Create** | `POST /vehicles` | novo carro entra no pátio com animação |
| **Read** | `GET /vehicles` / `GET /vehicles/:id` | pátio + lista + cartazes renderizados |
| **Update** | `PUT /vehicles/:id` | carro gira p/ destacar; cartaz reescrito |
| **Update parcial** | `PATCH /vehicles/:id` | botão "PATCH preço/cv" |
| **Delete** | `DELETE /vehicles/:id` | carro sai da cena e do armazenamento |

- **LocalStorage**: toda resposta é espelhada; sem API, o app opera do LocalStorage.
- **Mocks aleatórios**: `js/data/mock.js` (marca, modelo, **categoria**, ano, cor, potência, preço, placa).
- **Interação em RA**: clique, **gaze** (olhar fixo, cursor da câmera AR) e **botões virtuais 3D**
  (`NOVO / ANT / PROX / APAGAR`), além do painel HTML.

### Diferenciação visual dos veículos
`js/components/vehicle.js` monta o modelo 3D conforme a **categoria**:
`hatch` (compacto) · `sedan` (3 volumes, porta-malas) · `caminhonete` (cabine + caçamba, mais alto) · `suv` (alto, teto longo).

### Test Drive
`js/scene/test-drive.js`: cria um veículo igual ao selecionado na **rotatória** e o anima numa
**trajetória circular suave**, orientando a frente pela tangente. Inicia/encerra pelo painel,
usa `tick()` (não trava a app) e não move o carro original do pátio.

---

## Estrutura

```
index.html                 cena (template) + painel HTML + dock
css/style.css               estilos

js/
  boot.js                   decide AR x Showroom e injeta a cena
  config.js                 URLs, portas, mapa, jogador, test drive
  api.js                    CRUD (fetch :3001) + espelho/fallback LocalStorage + log
  data/
    catalog.js              marcas/modelos + CATEGORIA + cores
    mock.js                 geração aleatória
  components/
    vehicle.js              modelo 3D procedural por categoria
    virtual-button.js       botão virtual 3D
    player-controls.js      movimentação do jogador (WASD + colisão)
  scene/
    city.js                 mapa/cenário planejado (avenida, quarteirões, pátio, estacionamento, rotatória)
    lineup.js               vitrine do CRUD + seleção + cartazes
    test-drive.js           sistema de test drive (trajetória circular)
  ui/
    panel.js                painel da concessionária (form CRUD, lista, log, test drive)

scripts/
  seed.js                   `node scripts/seed.js 8` regrava o db.json
  gen-marker.js             gera o marcador customizado (.patt + .png)
  https-config.js           certificado autoassinado p/ `front:https`

db.json                     banco do JSON Server
```

---

## Rodando no GitHub Codespaces

1. No repositório no GitHub: **Code ▸ Codespaces ▸ Create codespace on main**.
2. O `.devcontainer/devcontainer.json` já instala tudo (`npm install`) e mapeia as portas.
3. No terminal do Codespace: `npm start`.
4. Na aba **PORTS**, deixe as portas **8080** e **3001** como **Public** (clique direito ▸ Port Visibility).
5. Abra a URL pública da porta 8080 (algo como `https://SEU-CODESPACE-8080.app.github.dev`) —
   já é **HTTPS**, então a câmera funciona direto, sem túnel.
6. Gere o QR para essa URL: `npm run qr -- https://SEU-CODESPACE-8080.app.github.dev/`.

`js/config.js` já detecta o padrão de URL do Codespaces e aponta a API para a porta 3001 automaticamente.

## Publicar (link fixo) e QR para o pessoal escanear

O Frontend é 100% estático — dá pra publicar em qualquer hospedagem HTTPS (GitHub Pages, Netlify, Codespaces):

```bash
npm run qr -- https://SEU_LINK_PUBLICADO/
```

Isso gera `assets/qr-abrir-no-celular.png`, que já aparece automaticamente na página
`imprimir.html` ao lado do marcador — um único impresso com **"escaneie para abrir"** +
**"aponte para o marcador"**. Sem link publicado ainda, use `npm run tunnel` (Cloudflare) ou
`npm run qr` (rede local + `npm run dev:https`).

> Sem a API (GitHub Pages/Codespaces sem :3001 público), o CRUD roda pelo **LocalStorage** —
> `js/config.js` detecta isso e nem tenta a API nesses casos.

---

## Dica para a apresentação
Abra o **console do navegador**: cada ação imprime o verbo HTTP
(`POST /vehicles`, `PUT /vehicles/3`, `DELETE /vehicles/3`, …), e o mesmo aparece no
cartão **"Requisições HTTP"** do painel.
