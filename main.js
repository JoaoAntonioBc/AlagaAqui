// --- CONFIGURAÇÕES TÉCNICAS ---
const ALTURA_BONECO_M = 1.70; // Referência da cabeça do boneco em metros
const ALTURA_BONECO_PX = 280; // Altura da imagem do boneco (boneco.png) em pixels

// --- ELEMENTOS DO DOM ---
const waterLayer = document.getElementById('water-level');
const depthValueDisplay = document.getElementById('depth-value');
const riskDescription = document.getElementById('risk-description');
const riverWater = document.getElementById('river-water-level');
const riverDepthDisplay = document.getElementById('river-depth-value');
const riverStatusText = document.getElementById('river-status');

// --- 1. LÓGICA DE ATUALIZAÇÃO DA INTERFACE ---
function atualizarInterface(profundidadeM) {
    // 1.1 Atualiza o Medidor de Rua (Boneco)
    if (waterLayer) {
        // Cálculo de precisão: (profundidade atual / altura total) * altura da imagem
        const pixelsAgua = (profundidadeM / ALTURA_BONECO_M) * ALTURA_BONECO_PX;
        // Aplicamos a altura em px para alinhar com as marcações do SVG
        waterLayer.style.height = `${Math.min(ALTURA_BONECO_PX, pixelsAgua)}px`;
    }

    // Atualiza o texto numérico da profundidade da rua
    if (depthValueDisplay) {
        depthValueDisplay.innerText = profundidadeM.toFixed(1);
    }

    // 1.2 Atualiza a Descrição e Cor do Risco (Baseado no valor real)
    if (riskDescription) {
        if (profundidadeM <= 0.15) {
            riskDescription.innerText = "NÍVEL SEGURO";
            riskDescription.style.color = "#28a745"; // Verde
        } else if (profundidadeM <= 0.60) {
            riskDescription.innerText = "RISCO MODERADO (JOELHO)";
            riskDescription.style.color = "#F89737"; // Laranja
        } else {
            riskDescription.innerText = "RISCO ALTO (EMERGÊNCIA)";
            riskDescription.style.color = "#dc3545"; // Vermelho
        }
    }

    // 1.3 Atualiza o Leito do Rio (Simulação Proporcional)
    if (riverWater) {
        // Simulamos que o rio sobe proporcionalmente à chuva (nível base 1.2m)
        const nivelRio = profundidadeM + 1.2; 
        const porcentagemRio = (nivelRio / 5.0) * 100; // O container do rio representa 5 metros
        
        riverWater.style.height = `${Math.min(100, porcentagemRio)}%`;
        
        if (riverDepthDisplay) {
            riverDepthDisplay.innerText = nivelRio.toFixed(1);
        }

        // Atualiza o status visual do transbordamento
        if (riverStatusText) {
            if (nivelRio >= 3.5) {
                riverStatusText.innerText = "TRANSBORDANDO";
                riverStatusText.style.color = "#dc3545";
            } else {
                riverStatusText.innerText = "Nível Normal";
                riverStatusText.style.color = "#28a745";
            }
        }
    }
}

// --- 2. FUNÇÃO CHAMADA PELO BOTÃO "SIMULAR CHUVA" ---
function simularAlagamento() {
    // Gera um valor aleatório entre 0.0m e 1.7m para testar os estados do dashboard
    const valorSimulado = (Math.random() * 1.7).toFixed(1);
    atualizarInterface(parseFloat(valorSimulado));
}

// --- 3. SISTEMA DE NAVEGAÇÃO (TROCA DE PÁGINAS) ---
function trocarPagina(targetId) {
    const todasPaginas = document.querySelectorAll('.page-content');
    todasPaginas.forEach(p => {
        p.style.display = 'none';
        p.classList.remove('active');
    });

    const paginaAlvo = document.getElementById(`page-${targetId}`);
    if (paginaAlvo) {
        paginaAlvo.style.display = 'block';
        paginaAlvo.classList.add('active');
    }
}

// Alterna sidebar com botão
const btnSidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('main-sidebar');

function definirEstadoSidebarMobile(aberto) {
    if (!sidebar) return;

    if (aberto) {
        sidebar.classList.add('open');
        sidebar.classList.remove('closed');
    } else {
        sidebar.classList.remove('open');
        sidebar.classList.add('closed');
    }

    if (btnSidebarToggle) {
        btnSidebarToggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    }
}

if (btnSidebarToggle) {
    btnSidebarToggle.addEventListener('click', function(event) {
        event.stopPropagation();
        if (!sidebar) return;

        if (window.matchMedia('(max-width: 900px)').matches) {
            const estaAberta = sidebar.classList.contains('open');
            definirEstadoSidebarMobile(!estaAberta);
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });
}

// Fecha sidebar mobile ao clicar fora
document.addEventListener('click', function(event) {
    const trigger = document.getElementById('sidebar-toggle');
    if (!sidebar || !trigger) return;

    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    if (!isMobile) return;

    if (sidebar.classList.contains('open') &&
        !sidebar.contains(event.target) &&
        !trigger.contains(event.target)) {
        definirEstadoSidebarMobile(false);
    }
});

// Fecha sidebar mobile ao clicar em item de menu (interna dentro do listener nav-item):
document.querySelectorAll('.nav-item').forEach(botao => {
    botao.addEventListener('click', function(e) {
        e.preventDefault();

        // Remove a classe active de todos e adiciona no clicado
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Troca a página visível
        const destino = this.getAttribute('data-target');
        trocarPagina(destino);

        // se estiver mobile, fecha sidebar automaticamente
        if (window.matchMedia('(max-width: 900px)').matches) {
            definirEstadoSidebarMobile(false);
        }
    });
});

// --- 4. FUNCIONALIDADES DA PÁGINA DE NOTÍCIAS ---
// Dados Reais dos Pontos Críticos de Sorocaba
const dadosNoticias = [
    { local: "Av. Dom Aguirre (Praça Lions)", status: "Crítico", classe: "danger", hora: "15:40" },
    { local: "Av. XV de Agosto (Retiro São João)", status: "Livre", classe: "success", hora: "15:30" },
    { local: "Rua Aparecida (Vila Progresso)", status: "Atenção", classe: "warning", hora: "15:35" },
    { local: "Bairro Vitória Régia (Rua J. Martinez)", status: "Crítico", classe: "danger", hora: "15:25" },
    { local: "Av. Afonso Vergueiro (Terminal)", status: "Livre", classe: "success", hora: "15:10" },
    { local: "Rua João Gabriel Mendes (M. do Carmo)", status: "Atenção", classe: "warning", hora: "15:22" },
    { local: "Av. Juvenal de Campos (Marginal Dir.)", status: "Livre", classe: "success", hora: "14:50" },
    { local: "Av. Antônio Carlos Comitre (Campolim)", status: "Livre", classe: "success", hora: "15:45" }
];

function renderizarNoticias() {
    const tabela = document.getElementById('tabela-corpo-noticias');
    if (tabela) {
        tabela.innerHTML = dadosNoticias.map(item => `
            <tr>
                <td><strong>${item.local}</strong></td>
                <td><span class="badge ${item.classe}">${item.status}</span></td>
                <td>${item.hora}</td>
            </tr>
        `).join('');
    }
}

function adicionarReporteNoticias() {
    const local = document.getElementById('input-local-noticias').value;
    const grav = document.getElementById('select-gravidade-noticias').value;
    if(!local) return alert("Por favor, indique a localização.");

    dadosNoticias.unshift({
        local: local,
        status: grav === 'danger' ? 'Crítico' : (grav === 'warning' ? 'Atenção' : 'Livre'),
        classe: grav,
        hora: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    });

    document.getElementById('input-local-noticias').value = "";
    renderizarNoticias();
    alert("Obrigado! Seu alerta foi publicado no sistema.");
}

// Atualizar relógio da página de notícias
setInterval(() => {
    const relogio = document.getElementById('relogio-noticias');
    if (relogio) {
        relogio.innerText = new Date().toLocaleTimeString();
    }
}, 1000);

// Inicializar quando a página carrega
renderizarNoticias();
window.onload = () => {
    // Começa sempre no Dashboard com nível zerado
    trocarPagina('dashboard');
    atualizarInterface(0);
};