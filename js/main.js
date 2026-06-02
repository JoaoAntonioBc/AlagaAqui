// --- CONFIGURAÇÕES TÉCNICAS ---
const ALTURA_BONECO_M = 1.70;
const ALTURA_BONECO_PX = 280;
const SOROCABA = {
    lat: -23.5015,
    lon: -47.4526,
    timezone: "America/Sao_Paulo"
};

// --- ELEMENTOS DO DOM ---
const waterLayer = document.getElementById('water-level');
const depthValueDisplay = document.getElementById('depth-value');
const riskDescription = document.getElementById('risk-description');
const riverWater = document.getElementById('river-water-level');
const riverDepthDisplay = document.getElementById('river-depth-value');
const riverStatusText = document.getElementById('river-status');
const statusNotification = document.getElementById('status-notification');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const statusDesc = document.getElementById('status-desc');

let mapaAlagamento;
let camadaMarcadores;
let ultimoResumoClima = {
    chuva24h: 0,
    chuvaMensal: 0,
    risco: "success",
    descricao: "Sem dados recentes"
};

// Dados iniciais dos pontos críticos de Sorocaba. Reportes do usuário entram nessa mesma lista.
const dadosNoticias = [
    { local: "Av. Dom Aguirre (Praça Lions)", status: "Crítico", classe: "danger", hora: "15:40", lat: -23.4877, lon: -47.4554, detalhe: "Trecho próximo ao Rio Sorocaba." },
    { local: "Av. XV de Agosto (Retiro São João)", status: "Livre", classe: "success", hora: "15:30", lat: -23.4742, lon: -47.4668, detalhe: "Fluxo normal no momento." },
    { local: "Rua Aparecida (Vila Progresso)", status: "Atenção", classe: "warning", hora: "15:35", lat: -23.5112, lon: -47.4669, detalhe: "Possibilidade de água na pista." },
    { local: "Bairro Vitória Régia (Rua J. Martinez)", status: "Crítico", classe: "danger", hora: "15:25", lat: -23.4352, lon: -47.4946, detalhe: "Área sensível a enxurradas." },
    { local: "Av. Afonso Vergueiro (Terminal)", status: "Livre", classe: "success", hora: "15:10", lat: -23.5013, lon: -47.4595, detalhe: "Monitoramento preventivo." },
    { local: "Rua João Gabriel Mendes (M. do Carmo)", status: "Atenção", classe: "warning", hora: "15:22", lat: -23.5226, lon: -47.4277, detalhe: "Histórico de acúmulo em chuva forte." },
    { local: "Av. Juvenal de Campos (Marginal Dir.)", status: "Livre", classe: "success", hora: "14:50", lat: -23.4894, lon: -47.4481, detalhe: "Sem bloqueio informado." },
    { local: "Av. Antônio Carlos Comitre (Campolim)", status: "Livre", classe: "success", hora: "15:45", lat: -23.5346, lon: -47.4779, detalhe: "Sem alerta ativo." }
];

function escapeHTML(valor) {
    return String(valor).replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#039;"
    }[caractere]));
}

function formatarNumero(valor, casas = 1) {
    return Number(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function classeParaStatus(classe) {
    if (classe === 'danger') return 'Crítico';
    if (classe === 'warning') return 'Atenção';
    return 'Livre';
}

function atualizarInterface(profundidadeM, nivelRioManual) {
    const profundidade = Number(profundidadeM || 0);

    if (waterLayer) {
        const pixelsAgua = (profundidade / ALTURA_BONECO_M) * ALTURA_BONECO_PX;
        waterLayer.style.height = `${Math.min(ALTURA_BONECO_PX, pixelsAgua)}px`;
    }

    if (depthValueDisplay) {
        depthValueDisplay.innerText = profundidade.toFixed(1);
    }

    if (riskDescription) {
        if (profundidade <= 0.15) {
            riskDescription.innerText = "NÍVEL SEGURO";
            riskDescription.style.color = "#28a745";
        } else if (profundidade <= 0.60) {
            riskDescription.innerText = "RISCO MODERADO (JOELHO)";
            riskDescription.style.color = "#F89737";
        } else {
            riskDescription.innerText = "RISCO ALTO (EMERGÊNCIA)";
            riskDescription.style.color = "#dc3545";
        }
    }

    if (riverWater) {
        const nivelRio = Number(nivelRioManual || (profundidade + 1.2));
        const porcentagemRio = (nivelRio / 5.0) * 100;

        riverWater.style.height = `${Math.min(100, porcentagemRio)}%`;

        if (riverDepthDisplay) {
            riverDepthDisplay.innerText = nivelRio.toFixed(1);
        }

        if (riverStatusText) {
            if (nivelRio >= 3.5) {
                riverStatusText.innerText = "TRANSBORDANDO";
                riverStatusText.style.color = "#dc3545";
            } else if (nivelRio >= 2.6) {
                riverStatusText.innerText = "Nível de Atenção";
                riverStatusText.style.color = "#F89737";
            } else {
                riverStatusText.innerText = "Nível Normal";
                riverStatusText.style.color = "#28a745";
            }
        }
    }
}

function definirStatusGeral(classe, titulo, descricao) {
    if (!statusNotification || !statusText || !statusDesc) return;

    statusNotification.classList.remove('alert-danger', 'alert-warning', 'alert-success');
    statusNotification.classList.add(classe === 'danger' ? 'alert-danger' : classe === 'warning' ? 'alert-warning' : 'alert-success');
    statusText.innerText = titulo;
    statusDesc.innerText = descricao;

    if (statusIcon) {
        statusIcon.className = classe === 'danger'
            ? 'fa-solid fa-triangle-exclamation fa-2x'
            : classe === 'warning'
                ? 'fa-solid fa-cloud-showers-heavy fa-2x'
                : 'fa-solid fa-circle-check fa-2x';
    }
}

function estimarRiscoPorChuva(chuva24h) {
    if (chuva24h >= 80) {
        return {
            classe: "danger",
            titulo: "EMERGÊNCIA",
            texto: "Chuva extrema prevista nas próximas 24h.",
            profundidade: 0.85,
            nivelRio: 3.8
        };
    }

    if (chuva24h >= 45) {
        return {
            classe: "warning",
            titulo: "ATENÇÃO",
            texto: "Chuva forte pode gerar alagamentos pontuais.",
            profundidade: 0.45,
            nivelRio: 2.8
        };
    }

    if (chuva24h >= 20) {
        return {
            classe: "warning",
            titulo: "OBSERVAÇÃO",
            texto: "Há previsão de chuva moderada para Sorocaba.",
            profundidade: 0.18,
            nivelRio: 2.0
        };
    }

    return {
        classe: "success",
        titulo: "NORMAL",
        texto: "Sem chuva relevante prevista nas próximas 24h.",
        profundidade: 0.05,
        nivelRio: 1.2
    };
}

function simularAlagamento() {
    const valorSimulado = (Math.random() * 1.7).toFixed(1);
    atualizarInterface(parseFloat(valorSimulado));
}

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

    if (targetId === 'mapa') {
        iniciarMapa();
        setTimeout(() => {
            if (mapaAlagamento) mapaAlagamento.invalidateSize();
        }, 120);
    }
}

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

document.querySelectorAll('.nav-item').forEach(botao => {
    botao.addEventListener('click', function(e) {
        e.preventDefault();

        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        const destino = this.getAttribute('data-target');
        trocarPagina(destino);

        if (window.matchMedia('(max-width: 900px)').matches) {
            definirEstadoSidebarMobile(false);
        }
    });
});

function renderizarNoticias() {
    const tabela = document.getElementById('tabela-corpo-noticias');
    if (tabela) {
        tabela.innerHTML = dadosNoticias.map(item => `
            <tr>
                <td><strong>${escapeHTML(item.local)}</strong></td>
                <td><span class="badge ${item.classe}">${escapeHTML(item.status)}</span></td>
                <td>${escapeHTML(item.hora)}</td>
            </tr>
        `).join('');
    }

    const interditados = dadosNoticias.filter(item => item.classe === 'danger').length;
    const blockedCount = document.getElementById('community-blocked-count');
    if (blockedCount) blockedCount.innerText = `${interditados} ${interditados === 1 ? 'local' : 'locais'}`;

    renderizarPontosCriticos();
    atualizarMarcadoresMapa();
}

function renderizarPontosCriticos() {
    const listaCompleta = document.getElementById('critical-points-list');
    const listaMapa = document.getElementById('map-risk-list');
    const conteudo = dadosNoticias.map(item => `
        <article class="risk-item">
            <span class="risk-dot ${item.classe}" aria-hidden="true"></span>
            <div>
                <h4>${escapeHTML(item.local)}</h4>
                <p>${escapeHTML(item.detalhe || 'Reporte comunitário em monitoramento.')}</p>
            </div>
            <span class="badge ${item.classe}">${escapeHTML(item.status)}</span>
        </article>
    `).join('');

    if (listaCompleta) listaCompleta.innerHTML = conteudo;
    if (listaMapa) listaMapa.innerHTML = conteudo;
}

function adicionarReporteNoticias() {
    const input = document.getElementById('input-local-noticias');
    const select = document.getElementById('select-gravidade-noticias');
    const feedback = document.getElementById('report-feedback');
    const local = input ? input.value.trim() : "";
    const grav = select ? select.value : "success";

    if (!local) {
        if (feedback) feedback.innerText = "Informe a localização antes de publicar.";
        return;
    }

    const offset = dadosNoticias.length * 0.002;
    dadosNoticias.unshift({
        local,
        status: classeParaStatus(grav),
        classe: grav,
        hora: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}),
        lat: SOROCABA.lat + offset,
        lon: SOROCABA.lon - offset,
        detalhe: "Reporte enviado pela comunidade."
    });

    if (input) input.value = "";
    if (feedback) feedback.innerText = "Obrigado! Seu alerta foi publicado no painel.";
    renderizarNoticias();
}

function montarUrlOpenMeteo() {
    const params = new URLSearchParams({
        latitude: SOROCABA.lat,
        longitude: SOROCABA.lon,
        hourly: "precipitation,precipitation_probability",
        daily: "precipitation_sum",
        past_days: "31",
        forecast_days: "2",
        timezone: SOROCABA.timezone
    });

    return `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
}

async function carregarClimaOpenMeteo() {
    try {
        const resposta = await fetch(montarUrlOpenMeteo());
        if (!resposta.ok) throw new Error("Falha ao consultar Open-Meteo");

        const dados = await resposta.json();
        aplicarDadosClima(dados);
    } catch (erro) {
        console.error(erro);
        definirStatusGeral("warning", "SEM CONEXÃO", "Não foi possível atualizar a previsão da Open-Meteo.");
        const weatherRisk = document.getElementById('weather-risk-text');
        if (weatherRisk) weatherRisk.innerText = "Não foi possível carregar a previsão agora.";
    }
}

function aplicarDadosClima(dados) {
    const agora = new Date();
    const horas = dados.hourly?.time || [];
    const chuvaHora = dados.hourly?.precipitation || [];
    const probHora = dados.hourly?.precipitation_probability || [];

    const proximas24 = horas
        .map((hora, index) => ({
            hora: new Date(hora),
            chuva: Number(chuvaHora[index] || 0),
            prob: Number(probHora[index] || 0)
        }))
        .filter(item => item.hora >= agora)
        .slice(0, 24);

    const chuva24h = proximas24.reduce((total, item) => total + item.chuva, 0);
    const maiorProb = proximas24.reduce((maior, item) => Math.max(maior, item.prob), 0);
    const risco = estimarRiscoPorChuva(chuva24h);

    const dias = dados.daily?.time || [];
    const chuvaDia = dados.daily?.precipitation_sum || [];
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();
    const diasDoMes = dias
        .map((dia, index) => ({
            data: new Date(`${dia}T12:00:00`),
            chuva: Number(chuvaDia[index] || 0)
        }))
        .filter(item => item.data.getMonth() === mesAtual && item.data.getFullYear() === anoAtual && item.data <= agora);

    const chuvaMensal = diasDoMes.reduce((total, item) => total + item.chuva, 0);

    ultimoResumoClima = {
        chuva24h,
        chuvaMensal,
        risco: risco.classe,
        descricao: risco.texto
    };

    atualizarInterface(risco.profundidade, risco.nivelRio);
    definirStatusGeral(risco.classe, risco.titulo, risco.texto);
    atualizarCardsClima(chuva24h, chuvaMensal, maiorProb, risco, proximas24, diasDoMes);
}

function atualizarCardsClima(chuva24h, chuvaMensal, maiorProb, risco, proximas24, diasDoMes) {
    const precip24 = document.getElementById('precip-24h');
    const weatherRisk = document.getElementById('weather-risk-text');
    const weatherUpdated = document.getElementById('weather-updated');
    const monthlyRain = document.getElementById('monthly-rain');
    const monthlyStatus = document.getElementById('monthly-rain-status');
    const communityRain = document.getElementById('community-rain-24h');
    const communityRiver = document.getElementById('community-river-level');
    const mapSummary = document.getElementById('map-weather-summary');
    const pointsContext = document.getElementById('points-weather-context');
    const pointsUpdated = document.getElementById('points-updated');

    if (precip24) precip24.innerText = formatarNumero(chuva24h, 1);
    if (weatherRisk) {
        weatherRisk.innerText = `${risco.texto} Probabilidade máxima: ${Math.round(maiorProb)}%.`;
        weatherRisk.className = `risk-text text-${risco.classe === 'danger' ? 'danger' : risco.classe === 'warning' ? 'warning' : 'success'}`;
    }
    if (weatherUpdated) weatherUpdated.innerText = `Fonte: Open-Meteo, atualizado às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
    if (monthlyRain) monthlyRain.innerText = formatarNumero(chuvaMensal, 1);
    if (monthlyStatus) monthlyStatus.innerText = chuvaMensal >= 160 ? "Acima da média histórica usada como referência." : "Abaixo da média histórica usada como referência.";
    if (communityRain) communityRain.innerText = `${formatarNumero(chuva24h, 1)}mm (${risco.titulo})`;
    if (communityRiver && riverDepthDisplay) communityRiver.innerText = `${riverDepthDisplay.innerText}m (${riverStatusText?.innerText || 'monitorado'})`;
    if (mapSummary) mapSummary.innerText = `${formatarNumero(chuva24h, 1)}mm previstos nas próximas 24h. ${risco.texto}`;
    if (pointsContext) pointsContext.innerText = `Chuva prevista nas próximas 24h: ${formatarNumero(chuva24h, 1)}mm.`;
    if (pointsUpdated) pointsUpdated.innerText = `Open-Meteo atualizado às ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;

    renderizarBarras('forecast-bars', proximas24.slice(0, 12), item => item.chuva, item => item.hora.getHours().toString().padStart(2, '0'));
    renderizarBarras('monthly-bars', diasDoMes.slice(-10), item => item.chuva, item => item.data.getDate().toString().padStart(2, '0'));
}

function renderizarBarras(id, dados, valorFn, labelFn) {
    const container = document.getElementById(id);
    if (!container) return;

    if (!dados.length) {
        container.innerHTML = "<p>Sem dados disponíveis.</p>";
        return;
    }

    const maior = Math.max(...dados.map(valorFn), 1);
    container.innerHTML = dados.map(item => {
        const valor = valorFn(item);
        const altura = Math.max(18, (valor / maior) * 110);
        return `
            <div class="forecast-bar" style="height: ${altura}px" title="${formatarNumero(valor, 1)}mm">
                <span>${escapeHTML(labelFn(item))}</span>
            </div>
        `;
    }).join('');
}

function iniciarMapa() {
    const alvo = document.getElementById('flood-map');
    if (!alvo || typeof L === 'undefined') return;

    if (!mapaAlagamento) {
        mapaAlagamento = L.map(alvo).setView([SOROCABA.lat, SOROCABA.lon], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mapaAlagamento);
        camadaMarcadores = L.layerGroup().addTo(mapaAlagamento);
    }

    atualizarMarcadoresMapa();
}

function corMarcador(classe) {
    if (classe === 'danger') return '#b91c1c';
    if (classe === 'warning') return '#d97706';
    return '#15803d';
}

function atualizarMarcadoresMapa() {
    if (!camadaMarcadores || typeof L === 'undefined') return;

    camadaMarcadores.clearLayers();
    dadosNoticias.forEach(item => {
        const marker = L.circleMarker([item.lat, item.lon], {
            radius: item.classe === 'danger' ? 10 : 8,
            color: '#ffffff',
            weight: 2,
            fillColor: corMarcador(item.classe),
            fillOpacity: 0.88
        });

        marker.bindPopup(`
            <strong>${escapeHTML(item.local)}</strong><br>
            Status: ${escapeHTML(item.status)}<br>
            Atualização: ${escapeHTML(item.hora)}<br>
            Chuva 24h: ${formatarNumero(ultimoResumoClima.chuva24h, 1)}mm
        `);
        marker.addTo(camadaMarcadores);
    });
}

setInterval(() => {
    const relogio = document.getElementById('relogio-noticias');
    if (relogio) {
        relogio.innerText = new Date().toLocaleTimeString('pt-BR');
    }
}, 1000);

renderizarNoticias();
window.onload = () => {
    trocarPagina('dashboard');
    atualizarInterface(0);
    carregarClimaOpenMeteo();
};
