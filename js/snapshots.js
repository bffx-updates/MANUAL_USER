/* BFMiDi · Manual — PRINTS do editor (v15.1).
   Gerado por tools/capture_shots.mjs. NAO editar a mao: quando a tela
   do editor mudar, rode a captura de novo.
   { img, light?, w, h, kind?, hot: { seletor: [x, y, w, h] em fracao } } */
/* eslint-disable */
"use strict";

const MN_SHOTS = {
 "preset-tela": {
  "img": "img/shots/preset-tela.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-bank-tile": [
    0.0281,
    0.0422,
    0.1261,
    0.1534
   ],
   ".bf-bank-keys": [
    0.1605,
    0.0422,
    0.1645,
    0.1534
   ],
   ".bf-bank-name-pill": [
    0.0281,
    0.2045,
    0.2969,
    0.0467
   ],
   ".bf-studio-np-pill-l.is-pc": [
    0.3563,
    0.2008,
    0.0391,
    0.0489
   ],
   ".bf-studio-np-ch-row": [
    0.3555,
    0.2619,
    0.2891,
    0.0511
   ],
   ".bf-save": [
    0.6641,
    0.9044,
    0.0469,
    0.0667
   ],
   ".bf-bank-console": [
    0.0187,
    0.0289,
    0.3156,
    0.8489
   ],
   ".bf-swlist": [
    0.0281,
    0.329,
    0.2969,
    0.5355
   ],
   ".bf-bank-center-stack": [
    0.3422,
    0.0289,
    0.3156,
    0.8489
   ],
   ".bf-bank-slot-display": [
    0.6656,
    0.0289,
    0.3156,
    0.8489
   ],
   ".bf-tabbar": [
    0.2813,
    0.8933,
    0.4375,
    0.0889
   ]
  }
 },
 "preset-console": {
  "img": "img/shots/preset-console.webp",
  "w": 404,
  "h": 764,
  "hot": {
   ".bf-bank-tile": [
    0.0297,
    0.0157,
    0.3995,
    0.1807
   ],
   ".bf-bank-keys": [
    0.449,
    0.0157,
    0.5213,
    0.1807
   ],
   ".bf-bank-name-pill": [
    0.0297,
    0.2069,
    0.9406,
    0.055
   ],
   ".bf-mobile-home-mode": [
    0.0297,
    0.2723,
    0.9406,
    0.055
   ],
   ".bf-mobile-home-layer": [
    0.6699,
    0.2723,
    0.3004,
    0.055
   ]
  }
 },
 "preset-principal": {
  "img": "img/shots/preset-principal.webp",
  "w": 404,
  "h": 863,
  "hot": {
   ".bf-studio-np-pill-l.is-pc": [
    0.0446,
    0.1792,
    0.1238,
    0.051
   ],
   ".bf-studio-np-ch-row": [
    0.0421,
    0.243,
    0.9158,
    0.0533
   ],
   ".bf-studio-np-extras-btn": [
    0.75,
    0.243,
    0.2079,
    0.0533
   ],
   ".bf-np-shortcut.is-accent": [
    0.0668,
    0.3357,
    0.8663,
    0.0973
   ],
   ".bf-np-shortcut.is-device": [
    0.0668,
    0.4446,
    0.2723,
    0.095
   ],
   ".bf-np-shortcut:not(.is-accent):not(.is-device)": [
    0.6609,
    0.4446,
    0.2723,
    0.095
   ]
  }
 },
 "preset-display": {
  "img": "img/shots/preset-display.webp",
  "w": 404,
  "h": 570,
  "hot": {
   ".bf-grid-screen": [
    0.0347,
    0.0246,
    0.9307,
    0.95
   ],
   ".bf-dcfg-open": [
    0.0347,
    0.6342,
    0.9307,
    0.0912
   ],
   ".bf-dcfg-sum": [
    0.0347,
    0.743,
    0.9307,
    0.2316
   ]
  }
 },
 "preset-tabbar": {
  "img": "img/shots/preset-tabbar.webp",
  "w": 576,
  "h": 96,
  "hot": {
   ".bf-tabbar-conn": [
    0.0313,
    0.1875,
    0.1042,
    0.625
   ],
   ".bf-nav-settings": [
    0.1563,
    0.1875,
    0.1042,
    0.625
   ],
   ".bf-nav-home": [
    0.2813,
    0.1875,
    0.4375,
    0.625
   ],
   ".bf-tabbar-plus": [
    0.7396,
    0.1875,
    0.1042,
    0.625
   ],
   ".bf-save": [
    0.8646,
    0.1875,
    0.1042,
    0.625
   ]
  }
 },
 "preset-extras": {
  "img": "img/shots/preset-extras.webp",
  "w": 404,
  "h": 764,
  "hot": {}
 },
 "preset-bancos": {
  "img": "img/shots/preset-bancos.webp",
  "w": 420,
  "h": 396,
  "hot": {}
 },
 "preset-acoes": {
  "img": "img/shots/preset-acoes.webp",
  "w": 576,
  "h": 290,
  "hot": {}
 },
 "live-tela": {
  "img": "img/shots/live-tela.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-bank-tile": [
    0.0281,
    0.0422,
    0.1261,
    0.1534
   ],
   ".bf-bank-keys": [
    0.1605,
    0.0422,
    0.1645,
    0.1534
   ],
   ".bf-sw-mode-field": [
    0.3602,
    0.0544,
    0.2797,
    0.0711
   ],
   ".bf-sw-display-card": [
    0.6656,
    0.0289,
    0.3156,
    0.8489
   ]
  }
 },
 "live-display": {
  "img": "img/shots/live-display.webp",
  "w": 386,
  "h": 519,
  "hot": {
   ".bf-sw-disp-group-preview": [
    0.0596,
    0.0443,
    0.8808,
    0.2987
   ],
   ".bf-sw-disp-colors": [
    0.0596,
    0.3622,
    0.8808,
    0.2062
   ],
   ".bf-sw-disp-name-row": [
    0.0881,
    0.6127,
    0.8238,
    0.1676
   ],
   ".bf-sw-disp-font": [
    0.0881,
    0.7996,
    0.8238,
    0.131
   ]
  }
 },
 "sw-picker": {
  "img": "img/shots/sw-picker.webp",
  "w": 440,
  "h": 627,
  "hot": {}
 },
 "sw-stomp": {
  "img": "img/shots/sw-stomp.webp",
  "w": 404,
  "h": 545,
  "hot": {
   ".bf-sw-fx2-tabs": [
    0.0569,
    0.2794,
    0.8861,
    0.0844
   ],
   ".bf-typebtn-row": [
    0.0619,
    0.3931,
    0.8762,
    0.1174
   ],
   ".bf-sw-fx1-chrow": [
    0.0619,
    0.5399,
    0.8762,
    0.1174
   ],
   ".bf-sw-opt-card": [
    0.0619,
    0.6867,
    0.8762,
    0.1982
   ]
  }
 },
 "sw-spin": {
  "img": "img/shots/sw-spin.webp",
  "w": 404,
  "h": 1237,
  "hot": {}
 },
 "sw-ramp": {
  "img": "img/shots/sw-ramp.webp",
  "w": 404,
  "h": 1084,
  "hot": {}
 },
 "sw-momentary": {
  "img": "img/shots/sw-momentary.webp",
  "w": 404,
  "h": 908,
  "hot": {}
 },
 "sw-macros": {
  "img": "img/shots/sw-macros.webp",
  "w": 404,
  "h": 735,
  "hot": {}
 },
 "sw-tap": {
  "img": "img/shots/sw-tap.webp",
  "w": 404,
  "h": 895,
  "hot": {}
 },
 "sw-single": {
  "img": "img/shots/sw-single.webp",
  "w": 404,
  "h": 895,
  "hot": {}
 },
 "sw-steps": {
  "img": "img/shots/sw-steps.webp",
  "w": 404,
  "h": 1422,
  "hot": {}
 },
 "sw-control": {
  "img": "img/shots/sw-control.webp",
  "w": 404,
  "h": 565,
  "hot": {}
 },
 "sw-mute": {
  "img": "img/shots/sw-mute.webp",
  "w": 404,
  "h": 356,
  "hot": {}
 },
 "sw-custom": {
  "img": "img/shots/sw-custom.webp",
  "w": 404,
  "h": 801,
  "hot": {}
 },
 "preset-atalhos": {
  "img": "img/shots/preset-atalhos.webp",
  "w": 386,
  "h": 580,
  "hot": {
   ".bf-np-shortcut.is-gp5": [
    0.0466,
    0.1943,
    0.285,
    0.1414
   ],
   ".bf-np-shortcut.is-tonex": [
    0.3575,
    0.1943,
    0.285,
    0.1414
   ]
  }
 },
 "deved-gp5": {
  "img": "img/shots/deved-gp5.webp",
  "w": 1180,
  "h": 800,
  "hot": {
   ".bf-deved-lcd": [
    0.0186,
    0.095,
    0.2458,
    0.0675
   ],
   ".bf-deved-chain": [
    0.0186,
    0.1775,
    0.2458,
    0.5687
   ],
   ".bf-deved-block-head": [
    0.2966,
    0.2425,
    0.6661,
    0.06
   ],
   ".bf-deved-savename": [
    0.0186,
    0.7775,
    0.2458,
    0.055
   ],
   ".bf-deved-actions": [
    0.0186,
    0.845,
    0.2458,
    0.13
   ]
  }
 },
 "deved-tonex": {
  "img": "img/shots/deved-tonex.webp",
  "w": 1180,
  "h": 800,
  "hot": {}
 },
 "stage-1": {
  "img": "img/shots/stage-1.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-stage-name-big": [
    0.0507,
    0.1499,
    0.4186,
    0.2867
   ],
   ".bf-stage-img": [
    0.5,
    0.022,
    0.48,
    0.5279
   ],
   ".bf-stage-sws": [
    0.02,
    0.5719,
    0.96,
    0.2264
   ],
   ".bf-stage-fsw": [
    0.02,
    0.8203,
    0.96,
    0.1577
   ],
   ".bf-stage-handle": [
    0.4641,
    0,
    0.0719,
    0.0289
   ]
  },
  "light": "img/shots/stage-1.light.webp"
 },
 "stage-1-barra": {
  "img": "img/shots/stage-1-barra.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-stage-top .bf-stage-pill:first-child": [
    0.1084,
    0.0153,
    0.0725,
    0.0467
   ],
   ".bf-stage-pill.is-tag": [
    0.4844,
    0.0153,
    0.0832,
    0.0467
   ],
   ".bf-stage-top button[aria-haspopup='dialog']": [
    0.5739,
    0.0153,
    0.1447,
    0.0467
   ],
   ".bf-stage-status": [
    0.7249,
    0.0153,
    0.1667,
    0.0467
   ]
  },
  "light": "img/shots/stage-1-barra.light.webp"
 },
 "stage-set-p1": {
  "img": "img/shots/stage-set-p1.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-set-p1.light.webp"
 },
 "stage-set-geral": {
  "img": "img/shots/stage-set-geral.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-set-geral.light.webp"
 },
 "stage-set-visual": {
  "img": "img/shots/stage-set-visual.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-set-visual.light.webp"
 },
 "stage-set-p2": {
  "img": "img/shots/stage-set-p2.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-set-p2.light.webp"
 },
 "stage-2": {
  "img": "img/shots/stage-2.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-stage-head": [
    0.02,
    0.022,
    0.96,
    0.2078
   ],
   ".bf-stage-chain": [
    0.02,
    0.2518,
    0.96,
    0.2801
   ],
   ".bf-stage-model": [
    0.02,
    0.5635,
    0.2496,
    0.2252
   ],
   ".bf-stage-knobs": [
    0.3358,
    0.5635,
    0.5779,
    0.2252
   ],
   ".bf-stage-fsw": [
    0.02,
    0.8203,
    0.96,
    0.1577
   ]
  },
  "light": "img/shots/stage-2.light.webp"
 },
 "deved-nano": {
  "img": "img/shots/deved-nano.webp",
  "w": 1180,
  "h": 800,
  "hot": {}
 },
 "stage-2-nano": {
  "img": "img/shots/stage-2-nano.webp",
  "w": 1280,
  "h": 900,
  "hot": {}
 },
 "stage-set-img": {
  "img": "img/shots/stage-set-img.webp",
  "w": 1280,
  "h": 900,
  "hot": {}
 },
 "stage-land": {
  "img": "img/shots/stage-land.webp",
  "w": 844,
  "h": 390,
  "hot": {},
  "kind": "landscape"
 },
 "connect-popup": {
  "img": "img/shots/connect-popup.webp",
  "w": 420,
  "h": 586,
  "hot": {
   ".bf-cx-radar": [
    0.3214,
    0.1713,
    0.3571,
    0.256
   ],
   ".bf-cx-opt:nth-child(1)": [
    0.0548,
    0.5609,
    0.281,
    0.3072
   ],
   ".bf-cx-opt:nth-child(2)": [
    0.3595,
    0.5609,
    0.281,
    0.3072
   ],
   ".bf-cx-opt:nth-child(3)": [
    0.6643,
    0.5609,
    0.281,
    0.3072
   ],
   ".bf-cx-help-toggle": [
    0.3087,
    0.8988,
    0.3826,
    0.0751
   ]
  }
 },
 "tabbar-offline": {
  "img": "img/shots/tabbar-offline.webp",
  "w": 576,
  "h": 96,
  "hot": {
   ".bf-tabbar-conn": [
    0.0313,
    0.1875,
    0.1042,
    0.625
   ]
  }
 },
 "phone-preset": {
  "img": "img/shots/phone-preset.webp",
  "w": 390,
  "h": 844,
  "hot": {
   ".bf-bank-console": [
    0.0308,
    0.0071,
    0.9385,
    0.2956
   ],
   ".bf-studio-np-headbar": [
    0.0744,
    0.3418,
    0.8513,
    0.0699
   ],
   ".bf-np-shortcuts": [
    0.0744,
    0.6341,
    0.8513,
    0.4481
   ],
   ".bf-tabbar": [
    0.0359,
    0.9076,
    0.9282,
    0.0806
   ]
  },
  "kind": "phone"
 },
 "ked": {
  "img": "img/shots/ked.webp",
  "w": 1180,
  "h": 800,
  "hot": {
   ".bf-deved-lcd": [
    0.0186,
    0.095,
    0.2458,
    0.0757
   ],
   ".bf-ked-notes": [
    0.0186,
    0.1857,
    0.2458,
    0.1044
   ],
   ".bf-deved-chain": [
    0.0186,
    0.305,
    0.2458,
    0.5087
   ],
   ".bf-deved-actions": [
    0.0186,
    0.845,
    0.2458,
    0.13
   ]
  }
 },
 "stage-kemper": {
  "img": "img/shots/stage-kemper.webp",
  "w": 1280,
  "h": 900,
  "hot": {}
 },
 "cfg-kemper": {
  "img": "img/shots/cfg-kemper.webp",
  "w": 668,
  "h": 483,
  "hot": {}
 },
 "cfg-menu": {
  "img": "img/shots/cfg-menu.webp",
  "w": 600,
  "h": 675,
  "hot": {}
 },
 "cfg-amigavel": {
  "img": "img/shots/cfg-amigavel.webp",
  "w": 696,
  "h": 588,
  "hot": {}
 },
 "cfg-footswitches": {
  "img": "img/shots/cfg-footswitches.webp",
  "w": 696,
  "h": 568,
  "hot": {}
 },
 "cfg-exp": {
  "img": "img/shots/cfg-exp.webp",
  "w": 668,
  "h": 1024,
  "hot": {}
 },
 "cfg-bancos": {
  "img": "img/shots/cfg-bancos.webp",
  "w": 696,
  "h": 1158,
  "hot": {}
 },
 "cfg-tela": {
  "img": "img/shots/cfg-tela.webp",
  "w": 696,
  "h": 1253,
  "hot": {},
  "light": "img/shots/cfg-tela.light.webp"
 },
 "cfg-leds": {
  "img": "img/shots/cfg-leds.webp",
  "w": 696,
  "h": 483,
  "hot": {}
 },
 "cfg-hardware": {
  "img": "img/shots/cfg-hardware.webp",
  "w": 696,
  "h": 527,
  "hot": {}
 },
 "cfg-wifi": {
  "img": "img/shots/cfg-wifi.webp",
  "w": 696,
  "h": 393,
  "hot": {
   ".bf-wifi-state-grid, [class*='wifi-state']": [
    0.0503,
    0.5939,
    0.8994,
    0.2952
   ]
  }
 },
 "cfg-host": {
  "img": "img/shots/cfg-host.webp",
  "w": 696,
  "h": 836,
  "hot": {}
 },
 "cfg-bluetooth": {
  "img": "img/shots/cfg-bluetooth.webp",
  "w": 696,
  "h": 460,
  "hot": {}
 },
 "cfg-editor": {
  "img": "img/shots/cfg-editor.webp",
  "w": 696,
  "h": 1079,
  "hot": {}
 },
 "cfg-atualizar": {
  "img": "img/shots/cfg-atualizar.webp",
  "w": 696,
  "h": 624,
  "hot": {}
 },
 "cfg-atualizar-host": {
  "img": "img/shots/cfg-atualizar-host.webp",
  "w": 696,
  "h": 982,
  "hot": {}
 },
 "cfg-backup": {
  "img": "img/shots/cfg-backup.webp",
  "w": 696,
  "h": 567,
  "hot": {}
 },
 "cfg-testes": {
  "img": "img/shots/cfg-testes.webp",
  "w": 696,
  "h": 532,
  "hot": {}
 },
 "cfg-restaurar": {
  "img": "img/shots/cfg-restaurar.webp",
  "w": 696,
  "h": 345,
  "hot": {}
 },
 "stage-set-perfis": {
  "img": "img/shots/stage-set-perfis.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-set-perfis.light.webp"
 },
 "stage-fav": {
  "img": "img/shots/stage-fav.webp",
  "w": 1280,
  "h": 900,
  "hot": {},
  "light": "img/shots/stage-fav.light.webp"
 },
 "cfg-afinador": {
  "img": "img/shots/cfg-afinador.webp",
  "w": 696,
  "h": 888,
  "hot": {}
 },
 "cfg-user": {
  "img": "img/shots/cfg-user.webp",
  "w": 696,
  "h": 853,
  "hot": {}
 },
 "cfg-chamada": {
  "img": "img/shots/cfg-chamada.webp",
  "w": 696,
  "h": 782,
  "hot": {}
 },
 "cfg-combos": {
  "img": "img/shots/cfg-combos.webp",
  "w": 696,
  "h": 1357,
  "hot": {}
 },
 "cfg-imagens": {
  "img": "img/shots/cfg-imagens.webp",
  "w": 696,
  "h": 685,
  "hot": {}
 },
 "cfg-wifi-conectar": {
  "img": "img/shots/cfg-wifi-conectar.webp",
  "w": 696,
  "h": 892,
  "hot": {}
 },
 "preset-configurar-display": {
  "img": "img/shots/preset-configurar-display.webp",
  "w": 1180,
  "h": 780,
  "hot": {}
 },
 "sw-increment": {
  "img": "img/shots/sw-increment.webp",
  "w": 404,
  "h": 1328,
  "hot": {}
 },
 "sw-spring": {
  "img": "img/shots/sw-spring.webp",
  "w": 404,
  "h": 765,
  "hot": {}
 },
 "sw-wave": {
  "img": "img/shots/sw-wave.webp",
  "w": 404,
  "h": 1531,
  "hot": {}
 },
 "stage-swedit": {
  "img": "img/shots/stage-swedit.webp",
  "w": 1280,
  "h": 900,
  "hot": {}
 },
 "stage-sl": {
  "img": "img/shots/stage-sl.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-sl-head": [
    0.02,
    0.022,
    0.96,
    0.2581
   ],
   ".bf-sl-parts": [
    0.02,
    0.2973,
    0.96,
    0.1701
   ],
   ".bf-sl-notes": [
    0.02,
    0.4847,
    0.96,
    0.371
   ],
   ".bf-sl-foot": [
    0.02,
    0.8728,
    0.96,
    0.1052
   ],
   ".bf-sl-head-acts .bf-sl-chip:last-child": [
    0.8634,
    0.1558,
    0.0936,
    0.0669
   ],
   ".bf-stage-handle": [
    0.4641,
    0,
    0.0719,
    0.0289
   ]
  },
  "light": "img/shots/stage-sl.light.webp"
 },
 "stage-sl-editor": {
  "img": "img/shots/stage-sl-editor.webp",
  "w": 580,
  "h": 895,
  "hot": {
   ".bf-sl-sh-ttl": [
    0.0241,
    0.0838,
    0.8759,
    0.0573
   ],
   ".bf-sl-sh-mode .bf-sl-seg": [
    0.0241,
    0.176,
    0.9517,
    0.0559
   ],
   ".bf-sl-blk-main": [
    0.0241,
    0.2989,
    0.9517,
    0.0693
   ],
   ".bf-sl-blk-pre": [
    0.8414,
    0.3196,
    0.069,
    0.0279
   ],
   ".bf-sl-sh-sub .bf-sl-btn": [
    0.8081,
    0.2475,
    0.1677,
    0.038
   ],
   ".bf-sl-sh-addbtn": [
    0.0241,
    0.8612,
    0.1466,
    0.0447
   ],
   ".bf-sl-disc": [
    0.0241,
    0.9193,
    0.9517,
    0.0536
   ]
  },
  "light": "img/shots/stage-sl-editor.light.webp"
 },
 "stage-sl-backup": {
  "img": "img/shots/stage-sl-backup.webp",
  "w": 580,
  "h": 454,
  "hot": {
   ".bf-sl-bk-sec:first-child .bf-sl-acts .bf-sl-btn.is-primary": [
    0.0448,
    0.3918,
    0.2826,
    0.0881
   ],
   ".bf-sl-bk-sec:first-child .bf-sl-acts .bf-sl-btn:not(.is-primary)": [
    0.3412,
    0.3918,
    0.2366,
    0.0881
   ],
   ".bf-sl-rows.is-snaps": [
    0.0448,
    0.798,
    0.9103,
    0.1207
   ]
  },
  "light": "img/shots/stage-sl-backup.light.webp"
 },
 "stage-set-sl": {
  "img": "img/shots/stage-set-sl.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-stage-rail [role=tab]:nth-child(6)": [
    0.6609,
    0.4033,
    0.0531,
    0.06
   ],
   "[data-k=\"slLay\"]": [
    0.7305,
    0.1171,
    0.2586,
    0.2334
   ],
   "[data-k=\"slCurAnim\"]": [
    0.7305,
    0.3505,
    0.2586,
    0.2578
   ],
   ".bf-sl-screen": [
    0.0221,
    0.1696,
    0.612,
    0.6095
   ]
  },
  "light": "img/shots/stage-set-sl.light.webp"
 },
 "stage-sl-pe": {
  "img": "img/shots/stage-sl-pe.webp",
  "w": 646,
  "h": 891,
  "hot": {
   "[data-mn-mark=\"sl-call\"]": [
    0.031,
    0.9191,
    0.9381,
    0.0584
   ],
   "[data-mn-mark=\"sl-next\"]": [
    0.031,
    0.6764,
    0.9381,
    0.0584
   ],
   "[data-mn-mark=\"sl-song\"]": [
    0.031,
    0.7978,
    0.9381,
    0.0584
   ]
  },
  "light": "img/shots/stage-sl-pe.light.webp"
 },
 "stage-sl-parte": {
  "img": "img/shots/stage-sl-parte.webp",
  "w": 580,
  "h": 999,
  "hot": {
   ".bf-sl-pnav": [
    0.0241,
    0.1389,
    0.9517,
    0.044
   ],
   ".bf-sl-qans": [
    0.0552,
    0.2581,
    0.8966,
    0.0521
   ],
   ".bf-sl-pad-stage": [
    0.0552,
    0.5549,
    0.8034,
    0.1361
   ],
   ".bf-sl-pad-bksp": [
    0.8724,
    0.5629,
    0.0793,
    0.0561
   ],
   ".bf-sl-pad-keys": [
    0.0552,
    0.7273,
    0.8966,
    0.1161
   ],
   ".bf-sl-pad-more": [
    0.0552,
    0.8554,
    0.8966,
    0.046
   ],
   ".bf-sl-disc": [
    0.0241,
    0.9275,
    0.9517,
    0.048
   ]
  },
  "light": "img/shots/stage-sl-parte.light.webp"
 },
 "stage-sl-lista": {
  "img": "img/shots/stage-sl-lista.webp",
  "w": 1280,
  "h": 900,
  "hot": {
   ".bf-sl-sh-head .bf-sl-sh-ttl": [
    0.5578,
    0.0833,
    0.3969,
    0.057
   ],
   ".bf-sl-rows.is-songs .bf-sl-row-main": [
    0.5859,
    0.1559,
    0.3234,
    0.052
   ],
   ".bf-sl-rows.is-songs .bf-sl-grip": [
    0.9141,
    0.1574,
    0.0344,
    0.0489
   ],
   ".bf-sl-rows.is-songs .bf-sl-rx": [
    0.9531,
    0.1597,
    0.0313,
    0.0444
   ],
   ".bf-sl-addsong": [
    0.5578,
    0.3585,
    0.4313,
    0.0533
   ],
   ".bf-sl-sh-head .bf-sl-more": [
    0.9594,
    0.0833,
    0.0297,
    0.0422
   ],
   ".bf-sl-dock-head .is-undo": [
    0.9219,
    0.0133,
    0.0313,
    0.0444
   ]
  },
  "light": "img/shots/stage-sl-lista.light.webp"
 },
 "stage-sl-wizard": {
  "img": "img/shots/stage-sl-wizard.webp",
  "w": 584,
  "h": 844,
  "hot": {
   ".bf-sl-wz-prog": [
    0.0205,
    0.0853,
    0.9589,
    0.0118
   ],
   ".bf-sl-wz-rows": [
    0.0514,
    0.2377,
    0.8973,
    0.3246
   ],
   ".bf-sl-adds": [
    0.0514,
    0.5789,
    0.8973,
    0.0924
   ],
   ".bf-sl-wz-model": [
    0.0514,
    0.6879,
    0.8973,
    0.0545
   ],
   ".bf-sl-wz-next": [
    0.0514,
    0.9076,
    0.8973,
    0.0592
   ]
  },
  "light": "img/shots/stage-sl-wizard.light.webp"
 }
};
