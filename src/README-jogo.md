# Esquerda vs Direita

Jogo de luta 2D para navegador (HTML5 Canvas + JavaScript puro, sem dependências). Sátira política fictícia: os lutadores são personagens inventados.

## Como jogar localmente

Sirva a pasta com qualquer servidor estático e abra `index.html`:

```
python3 -m http.server 8000
# abra http://localhost:8000
```

Controles: A/D andar · Espaço pular · Shift defender · J soco · K chute · 1–4 habilidades · Esc pausar.
Tudo também funciona com mouse e toque pelos botões da barra inferior. Soco, chute e habilidades podem ser remapeados em Configurações.

## Estrutura

```
index.html                  telas, HUD e estilos
js/data/characters.js       DADOS: facções, golpes básicos, habilidades, personagens, atributos derivados
js/core/scenes.js           gerenciador de cenas + laço principal
js/core/input.js            entrada híbrida (teclado, mouse, toque)
js/core/settings.js         configurações persistidas
js/audio/audio.js           efeitos e trilha sintetizados (WebAudio)
js/render/art.js            arte procedural: lutadores, poses, retratos, ícones
js/render/stage.js          cenário de Brasília e torcidas
js/fx/effects.js            partículas, textos de impacto, flashes, tremor
js/combat/fighter.js        controlador de personagem (estado, física, animação)
js/combat/abilities.js      sistema de habilidades (requisitos + execução por tipo)
js/combat/combat.js         dano, bloqueio, colisão, projéteis e rajadas
js/combat/ai.js             oponente controlado pelo computador
js/combat/battle.js         gerenciador de combate (rodadas, tempo, vitória, render)
js/ui/*.js                  menu, seleção, configurações, HUD e cena de batalha
assets/                     PNGs exportados (retratos, ícones, spritesheets + JSON, cenário)
tools/                      build, exportação de assets e testes automatizados (Playwright)
```

## Adicionar um personagem

Só o arquivo `js/data/characters.js` muda:

1. Registre até 4 habilidades com `E.registerAbility({...})`. Tipos prontos: `melee`, `projectile`, `wave`, `rain`, `stomp`, `dash`, `teleport`, `shield`, `beam` (supremo).
2. Registre o lutador com `E.registerCharacter({...})`: nome, facção, atributos (força, velocidade, defesa, energia de 1 a 10), aparência (`look`) e a lista de habilidades.

Ele aparece sozinho na seleção, com atributos, retrato, HUD, botões e IA.

## Trocar a arte procedural por sprites definitivos

`E.Art.drawFighter(ctx, char, pose, opts)` é o único ponto de desenho do lutador. Para usar spritesheets, troque essa função por uma que escolha o quadro a partir de `pose` (as spritesheets em `assets/sprites/` vêm com JSON de quadros como modelo).

## Orientação (luta só na horizontal)

- **App (Capacitor):** travado na horizontal pelo projeto nativo (`scripts/configure-native.mjs` no pacote do app).
- **Navegador:** ao confirmar o personagem, o jogo pede tela cheia e `screen.orientation.lock('landscape')` quando o navegador permite (Chrome no Android). Se não der (Safari no iPhone, janelas incorporadas), a luta fica escondida e congelada atrás da tela "Gire seu celular para jogar" enquanto o aparelho estiver na vertical, e volta sozinha ao girar.
- Código: `js/core/orientation.js`.
