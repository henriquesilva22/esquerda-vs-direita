# Como publicar Esquerda vs Direita na App Store (e no Google Play)

O jogo já está pronto dentro deste projeto. O que falta só pode ser feito na sua máquina e nas suas contas: compilar no Xcode, assinar com a sua conta de desenvolvedor e enviar para revisão.

## 1. O que você precisa

| Item | Para quê | Custo |
|---|---|---|
| Um Mac com a versão mais recente do **Xcode** (App Store do Mac) | Compilar e enviar o app iOS | grátis |
| **Node.js 20 ou mais novo** (nodejs.org) | Rodar os scripts do projeto | grátis |
| Conta no **Apple Developer Program** (developer.apple.com/programs) | Publicar na App Store | US$ 99 por ano |
| Uma página pública com a **política de privacidade** | Campo obrigatório da loja | grátis (GitHub Pages, Google Sites etc.) |
| Um iPhone (opcional, mas recomendado) | Testar antes de enviar | — |

**Sem Mac?** Dá para compilar na nuvem com serviços como Codemagic ou Ionic Appflow, que aceitam projetos Capacitor. A conta Apple Developer continua obrigatória.

## 2. Personalize antes de começar

1. Em `capacitor.config.json`, troque `appId` por um identificador só seu, no formato de domínio invertido. Exemplo: `br.com.henrique.esquerdavsdireita`. Depois de publicado, esse identificador não pode mudar.
2. Em `loja/privacidade.html`, preencha `[SEU NOME OU EMPRESA]`, `[SEU E-MAIL DE CONTATO]` e `[DATA DE PUBLICAÇÃO]`. Publique essa página e guarde o link.

## 3. Gerar o projeto iOS

No Terminal, dentro desta pasta:

```bash
npm install
npm run setup:ios
```

O `setup:ios` faz tudo de uma vez:
- monta a pasta `www/` com o jogo e as fontes embutidas (funciona offline);
- cria o projeto Xcode em `ios/`;
- gera todos os tamanhos de ícone e splash a partir de `assets/`;
- trava o app na horizontal (iOS: Info.plist; Android: Activity com `screenOrientation="sensorLandscape"`), esconde a barra de status e declara que o app não usa criptografia (assim o envio não pergunta sobre exportação).

Depois abra no Xcode:

```bash
npm run ios
```

## 4. Configurar no Xcode

1. Clique em **App** na barra lateral → aba **Signing & Capabilities** → em **Team**, escolha a sua conta de desenvolvedor.
2. Aba **General**: confira **Version** `1.0` e **Build** `1`.
3. Em **Supported Destinations**, deixe iPhone e iPad. Se tirar o iPad, você não precisa enviar os prints de iPad.
4. Conecte o iPhone, escolha-o no topo da janela e clique em ▶ para testar no aparelho.

## 5. Criar o app no App Store Connect

Em appstoreconnect.apple.com → **Apps** → **+** → **Novo app**:
- Plataforma iOS · Nome **Esquerda vs Direita: Luta** · Idioma principal Português (Brasil)
- ID do pacote: o mesmo `appId` do passo 2 · SKU: qualquer código, ex. `evd-001`

Depois preencha a página da versão:
- **Prints**: arraste os arquivos de `loja/iphone-6.9/` (2868 × 1320) e, se tiver iPad, `loja/ipad-13/` (2752 × 2064).
- **Textos**: copie de `loja/TEXTOS-DA-LOJA.md` (nome, subtítulo, descrição, palavras-chave, notas para a revisão).
- **URL da política de privacidade** e **URL de suporte**: o link do passo 2 serve para os dois.
- **Privacidade do app**: marque "Dados não coletados".
- **Classificação etária**: responda como indicado em `TEXTOS-DA-LOJA.md` (resultado esperado: 9+).
- **Preço**: Grátis.

## 6. Enviar a versão

No Xcode: escolha **Any iOS Device (arm64)** no topo → menu **Product → Archive** → na janela que abre, **Distribute App → App Store Connect → Upload**.

Em 10 a 30 minutos a versão aparece no App Store Connect. Selecione-a na página da versão e clique em **Enviar para revisão**. A Apple costuma responder em 1 a 3 dias.

## Sobre a revisão da Apple

- A diretriz 1.1.1 da Apple proíbe conteúdo difamatório sobre pessoas reais, e humoristas e satiristas políticos costumam ser aceitos. Este jogo usa só personagens inventados, sem nomes nem rostos de políticos reais. Mantenha assim; colocar políticos reais é o caminho mais rápido para a rejeição.
- O texto em "Notas para a revisão" já explica isso em inglês para o revisor.
- Se for rejeitado, a Apple diz o motivo no Resolution Center e você pode responder ou ajustar e reenviar.

## Atualizar o jogo depois

1. Edite os arquivos em `src/`.
2. Rode `npm run ios`.
3. No Xcode, aumente o **Build** (2, 3, …) e, se quiser, a **Version** (1.1).
4. Faça **Product → Archive** e envie de novo.

## Google Play (Android)

1. Instale o Android Studio.
2. Rode `npm run setup:android` e depois `npm run android`.
3. No Android Studio: **Build → Generate Signed App Bundle** → crie a chave de assinatura e guarde-a bem; sem ela você não consegue atualizar o app.
4. No Play Console (US$ 25, pagamento único), crie o app e envie o `.aab`. Use os prints de `loja/google-play/` e a arte de destaque `arte-destaque-1024x500.png`.

## Estrutura do projeto

```
src/                    o jogo (HTML + JavaScript + fontes)
assets/                 ícone e splash de origem (1024 e 2732 px)
loja/                   prints, arte de destaque, textos e política de privacidade
scripts/build-www.mjs   monta www/ para o app
scripts/configure-native.mjs  orientação, tela cheia e barra de status no iOS/Android
capacitor.config.json   nome e identificador do app
```
