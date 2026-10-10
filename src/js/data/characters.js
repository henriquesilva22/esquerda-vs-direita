/* =========================================================
 * DADOS CONFIGURÁVEIS — facções, habilidades e personagens
 * Para adicionar um lutador: registre as habilidades em
 * E.registerAbility(...) e o personagem em E.registerCharacter(...).
 * Nenhum outro arquivo precisa mudar.
 * Todos os personagens são FICTÍCIOS (sátira genérica).
 * ========================================================= */
(function (E) {
  'use strict';

  E.FACTIONS = {
    esquerda: { id: 'esquerda', name: 'ESQUERDA', color: '#e3262f', light: '#ff5a4d', dark: '#4a0b10', glow: 'rgba(255,60,50,.65)' },
    direita:  { id: 'direita',  name: 'DIREITA',  color: '#1f6fe0', light: '#3fa9ff', dark: '#0a2148', glow: 'rgba(40,140,255,.65)', green: '#1ea54b', yellow: '#ffd21f' }
  };

  /* Golpes básicos (não consomem energia especial) */
  E.BASICS = {
    soco:  { id: 'soco',  name: 'Soco',  kind: 'melee', basic: true, dmg: 5, range: 80, hy: -150, hh: 60, kb: 140, startup: 0.07, active: 0.08, recovery: 0.16, pose: 'jab',  sound: 'punch', hitstun: 0.26, gain: 5 },
    chute: { id: 'chute', name: 'Chute', kind: 'melee', basic: true, dmg: 8, range: 108, hy: -100, hh: 70, kb: 230, startup: 0.13, active: 0.1, recovery: 0.26, pose: 'kick', sound: 'kick',  hitstun: 0.32, gain: 7 }
  };

  E.ABILITIES = {};
  E.registerAbility = function (def) {
    def.cost = def.cost || 0;
    def.cooldown = def.cooldown || 0;
    E.ABILITIES[def.id] = def;
  };

  /* ---------- Esquerda: Companheiro Rubro ---------- */
  E.registerAbility({ id: 'soco_popular', name: 'Soco Popular', icon: 'fist', kind: 'melee', effect: '11 de dano · empurra',
    dmg: 11, range: 100, hy: -150, hh: 70, kb: 300, startup: 0.12, active: 0.1, recovery: 0.24, lunge: 200, pose: 'punch', fx: 'red', sound: 'heavy', hitstun: 0.42, cooldown: 2.5, cost: 0, gain: 8 });
  E.registerAbility({ id: 'chuva_impostos', name: 'Chuva de Impostos', icon: 'coins', kind: 'rain', effect: '7 × 3,5 de dano',
    count: 7, dmg: 3.5, interval: 0.12, spread: 110, sprite: 'coin', cast: 0.45, pose: 'castUp', sound: 'coin', cooldown: 8, cost: 25 });
  E.registerAbility({ id: 'discurso_8h', name: 'Discurso de Oito Horas', icon: 'megaphone', kind: 'wave', effect: '6 de dano · atordoa 1,4s',
    dmg: 6, speed: 500, stun: 1.4, w: 80, h: 150, sprite: 'speech', cast: 0.5, pose: 'cast', sound: 'wave', cooldown: 10, cost: 20 });
  E.registerAbility({ id: 'mega_corrupcao', name: 'Megarrajada da Corrupção', icon: 'beamRed', kind: 'beam', super: true, effect: '34 de dano · supremo',
    dmg: 34, charge: 0.7, duration: 1.0, color: '#ff2a2a', color2: '#ffd0a0', particles: 'money', sound: 'beam', cost: 100 });

  /* ---------- Esquerda: Professora Estrela ---------- */
  E.registerAbility({ id: 'apagador_voador', name: 'Apagador Voador', icon: 'eraser', kind: 'projectile', effect: '9 de dano · à distância',
    dmg: 9, speed: 780, w: 46, h: 30, kb: 170, sprite: 'eraser', cast: 0.3, pose: 'throw', sound: 'whoosh', cooldown: 3, cost: 0 });
  E.registerAbility({ id: 'greve_geral', name: 'Greve Geral', icon: 'strike', kind: 'stomp', effect: '10 de dano em área · atordoa',
    dmg: 10, radius: 200, stun: 1.1, cast: 0.5, pose: 'stomp', sound: 'stomp', cooldown: 9, cost: 25 });
  E.registerAbility({ id: 'passeata', name: 'Passeata', icon: 'march', kind: 'dash', effect: '3 × 5 de dano · avanço',
    dmg: 5, hits: 3, speed: 720, duration: 0.5, kb: 90, finalKb: 320, pose: 'dash', sound: 'whoosh', cooldown: 6, cost: 15 });
  E.registerAbility({ id: 'mega_coletivo', name: 'Megarrajada do Coletivo', icon: 'beamStar', kind: 'beam', super: true, effect: '32 de dano · supremo',
    dmg: 32, charge: 0.7, duration: 1.0, color: '#ff3b6b', color2: '#ffe066', particles: 'stars', sound: 'beam', cost: 100 });

  /* ---------- Direita: Deputado Patriota ---------- */
  E.registerAbility({ id: 'golpe_patriotico', name: 'Golpe Patriótico', icon: 'flagFist', kind: 'melee', effect: '12 de dano · lança no ar',
    dmg: 12, range: 92, hy: -175, hh: 110, kb: 200, kbY: -560, startup: 0.14, active: 0.12, recovery: 0.3, lunge: 150, pose: 'uppercut', fx: 'patriot', sound: 'heavy', hitstun: 0.6, cooldown: 3, cost: 0, gain: 8 });
  E.registerAbility({ id: 'cortina_fumaca', name: 'Cortina de Fumaça', icon: 'smoke', kind: 'teleport', effect: 'esquiva · próximo golpe +60%',
    invuln: 0.75, bonus: 0.6, bonusTime: 2.2, pose: 'crouch', sound: 'smoke', cooldown: 7, cost: 15 });
  E.registerAbility({ id: 'blindagem_parlamentar', name: 'Blindagem Parlamentar', icon: 'shield', kind: 'shield', effect: '−70% de dano por 4,5s',
    duration: 4.5, reduction: 0.7, cast: 0.35, pose: 'shield', sound: 'shield', cooldown: 12, cost: 25 });
  E.registerAbility({ id: 'mega_rachadinha', name: 'Megarrajada da Rachadinha', icon: 'beamDocs', kind: 'beam', super: true, effect: '34 de dano · supremo',
    dmg: 34, charge: 0.7, duration: 1.0, color: '#22d06a', color2: '#ffe14a', particles: 'docs', sound: 'beam', cost: 100 });

  /* ---------- Direita: Coronel Agro ---------- */
  E.registerAbility({ id: 'trator_emendas', name: 'Trator de Emendas', icon: 'tractor', kind: 'dash', effect: '14 de dano · arrasta',
    dmg: 14, hits: 1, speed: 840, duration: 0.5, kb: 440, finalKb: 440, pose: 'dash', sound: 'engine', cooldown: 6, cost: 15 });
  E.registerAbility({ id: 'chuva_emendas', name: 'Chuva de Emendas', icon: 'docs', kind: 'rain', effect: '6 × 4 de dano',
    count: 6, dmg: 4, interval: 0.13, spread: 120, sprite: 'doc', cast: 0.45, pose: 'castUp', sound: 'paper', cooldown: 8, cost: 25 });
  E.registerAbility({ id: 'berrante', name: 'Berrante do Agro', icon: 'horn', kind: 'wave', effect: '7 de dano · atordoa 1,2s',
    dmg: 7, speed: 470, stun: 1.2, w: 80, h: 150, sprite: 'horn', cast: 0.5, pose: 'cast', sound: 'horn', cooldown: 10, cost: 20 });
  E.registerAbility({ id: 'mega_orcamento', name: 'Megarrajada do Orçamento', icon: 'beamGold', kind: 'beam', super: true, effect: '36 de dano · supremo',
    dmg: 36, charge: 0.75, duration: 1.0, color: '#ffb319', color2: '#fff3b0', particles: 'money', sound: 'beam', cost: 100 });

  /* ---------- Personagens ---------- */
  E.CHARACTERS = [];
  E.registerCharacter = function (def) { E.CHARACTERS.push(def); return def; };
  E.getCharacter = function (id) { return E.CHARACTERS.find(function (c) { return c.id === id; }); };

  E.registerCharacter({
    id: 'rubro', name: 'Companheiro Rubro', short: 'RUBRO', faction: 'esquerda',
    tagline: 'Sindicalista veterano da porta de fábrica',
    desc: 'Discursa até o adversário desmaiar de cansaço e transforma qualquer comício em pancadaria.',
    stats: { forca: 7, velocidade: 5, defesa: 7, energia: 8 },
    look: { body: 'stocky', skin: '#c98a5e', skinShade: '#a5683f', hair: 'curly', hairColor: '#2a1912', mustache: 'thick', mustacheColor: '#24150f',
      hat: 'cap', hatColor: '#d61f2b', jacket: '#6a4330', jacketShade: '#4b2e20', shirt: '#e0312f', tie: null, pants: '#3b2b22', shoes: '#191210', brows: '#24150f' },
    abilities: ['soco_popular', 'chuva_impostos', 'discurso_8h', 'mega_corrupcao'],
    quotes: { intro: 'Companheiros, a luta começa agora!', win: 'O povo venceu mais uma!' }
  });

  E.registerCharacter({
    id: 'estrela', name: 'Professora Estrela', short: 'ESTRELA', faction: 'esquerda',
    tagline: 'Líder da greve e da sala de aula',
    desc: 'Rápida e organizada. Ninguém escapa da lição de casa nem da marcha da categoria.',
    stats: { forca: 5, velocidade: 9, defesa: 5, energia: 7 },
    look: { body: 'slim', fem: true, skin: '#7a4a2e', skinShade: '#5d3520', hair: 'afro', hairColor: '#1c120d', headband: '#e3262f', eyewear: 'glasses',
      jacket: '#c4202c', jacketShade: '#931620', shirt: '#f4efe6', tie: null, pants: '#2b2230', shoes: '#16121a', brows: '#1c120d', lips: '#b0333a' },
    abilities: ['apagador_voador', 'greve_geral', 'passeata', 'mega_coletivo'],
    quotes: { intro: 'Hoje tem prova surpresa!', win: 'Nota dez em pancadaria.' }
  });

  E.registerCharacter({
    id: 'patriota', name: 'Deputado Patriota', short: 'PATRIOTA', faction: 'direita',
    tagline: 'Topete firme, óculos escuros, discurso inflamado',
    desc: 'Equilibrado e escorregadio. Some na fumaça e volta blindado pelo regimento interno.',
    stats: { forca: 7, velocidade: 7, defesa: 6, energia: 6 },
    look: { body: 'normal', skin: '#e8b48f', skinShade: '#c98d68', hair: 'pompadour', hairColor: '#e3b23c', eyewear: 'sunglasses',
      jacket: '#1d2b55', jacketShade: '#121c3a', shirt: '#f2f4f8', tie: '#1ea54b', sash: true, pants: '#18213f', shoes: '#0d0f16', brows: '#b98a22' },
    abilities: ['golpe_patriotico', 'cortina_fumaca', 'blindagem_parlamentar', 'mega_rachadinha'],
    quotes: { intro: 'Essa sessão está aberta!', win: 'Aprovado em regime de urgência.' }
  });

  E.registerCharacter({
    id: 'coronel', name: 'Coronel Agro', short: 'CORONEL', faction: 'direita',
    tagline: 'Dono da bancada e do trator',
    desc: 'Lento, pesado e difícil de derrubar. Quando o trator passa, não sobra nada na pauta.',
    stats: { forca: 9, velocidade: 4, defesa: 8, energia: 5 },
    look: { body: 'big', skin: '#d79a6e', skinShade: '#b27750', hair: 'none', hairColor: '#8d8d8d', mustache: 'handlebar', mustacheColor: '#d9d4c8',
      hat: 'cowboy', hatColor: '#7a4f28', jacket: '#7d6a3f', jacketShade: '#5c4d2b', shirt: '#2f6f3c', tie: null, pants: '#3a3326', shoes: '#4a2c16', brows: '#cfc8b8' },
    abilities: ['trator_emendas', 'chuva_emendas', 'berrante', 'mega_orcamento'],
    quotes: { intro: 'Abre a porteira!', win: 'Essa terra tem dono.' }
  });

  /* Atributos derivados (um único lugar para balancear) */
  E.derive = function (stats) {
    return {
      maxHp: 100,
      walk: 170 + stats.velocidade * 22,
      jump: 780 + stats.velocidade * 14,
      atkSpeed: 0.86 + stats.velocidade * 0.028,
      dmgOut: 0.75 + stats.forca * 0.05,
      dmgIn: 1.18 - stats.defesa * 0.045,
      energyGain: 0.6 + stats.energia * 0.08
    };
  };
})(window.EVD = window.EVD || {});
