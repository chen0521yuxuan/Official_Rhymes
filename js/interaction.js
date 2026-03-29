// 等待DOM和地图加载完成
document.addEventListener('DOMContentLoaded', () => {
    // 检查 Leaflet 是否可用
    if (typeof L === 'undefined') {
        console.error('Leaflet 库未加载，请检查网络或刷新页面重试。');
        document.getElementById('stats-info').innerHTML = '❌ 地图库加载失败，请刷新页面或检查网络。';
        return;
    }
    // 检查地图对象是否存在（由 map.js 创建）
    if (typeof map === 'undefined') {
        console.error('地图对象未初始化，请确保 map.js 正确加载且先于 interaction.js 执行。');
        document.getElementById('stats-info').innerHTML = '❌ 地图初始化失败，请检查控制台。';
        return;
    }
    // 检查 ECharts 是否加载成功
    if (typeof echarts === 'undefined') {
        console.warn('ECharts 库加载失败，图表将无法显示，请检查网络。');
        document.getElementById('chart-box').innerHTML = '<div style="text-align:center;padding:40px;">⚠️ ECharts 加载失败，请刷新页面或更换网络环境。</div>';
        return;
    }

    // ---------- 创建 marker 图层 ----------
    let markersLayer = L.layerGroup().addTo(map);
    let allMarkers = [];

    // 自定义图标生成函数（使用 div 图标，无需外部图片）
    function getIcon(level, status) {
        const isFu = level.includes("府衙");
        const markerColor = isFu ? "#aa4a2e" : "#528a3e";
        const opacity = status === "现存" ? 1 : 0.85;
        const html = `
            <div style="background-color: ${markerColor}; width: 32px; height: 32px; border-radius: 50% 50% 4px 50%; transform: rotate(45deg); border: 2px solid #f9e0a0; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: white; opacity: ${opacity};">
                <span style="transform: rotate(-45deg);">${isFu ? '府' : '县'}</span>
            </div>
            <div style="position: relative; top: -4px; font-size: 10px; font-weight: bold; text-align: center; background: rgba(255,245,220,0.8); border-radius: 10px; padding: 0 4px; white-space: nowrap;">${status === '现存' ? '●' : '◌'}${status === '现存' ? '现存' : '遗址'}</div>
        `;
        return L.divIcon({ className: 'custom-marker', html: html, iconSize: [32, 42], iconAnchor: [16, 42], popupAnchor: [0, -36] });
    }

    // 弹窗内容构建
    function buildPopupContent(d) {
        return `
            <div class="custom-popup">
                <div class="popup-title">${d.name} · ${d.level}</div>
                <div class="popup-detail"><strong>📅 始建/重建：</strong> ${d.built}</div>
                <div class="popup-detail"><strong>🏛️ 大堂规制：</strong> ${d.hallSpec}</div>
                <div class="popup-detail"><strong>🏠 屋顶形制：</strong> ${d.roof}</div>
                <div class="popup-detail"><strong>📐 占地面积：</strong> ${d.area.toLocaleString()}㎡</div>
                <div class="popup-detail"><strong>📖 特色：</strong> ${d.desc}</div>
                <div class="popup-detail"><strong>🗺️ 保存状态：</strong> ${d.status === "现存" ? "🏯 现存建筑群" : "📜 遗址/文献可考"}</div>
                <div class="source"><strong>📚 来源：</strong> ${d.source}</div>
            </div>
        `;
    }

    // 初始化所有 marker
    function initMarkers() {
        markersLayer.clearLayers();
        allMarkers = [];
        yamenData.forEach(item => {
            const icon = getIcon(item.level, item.status);
            const marker = L.marker([item.lat, item.lng], { icon: icon });
            marker.bindPopup(buildPopupContent(item), { maxWidth: 280 });
            marker.yamenLevel = item.level;
            marker.yamenName = item.name;
            marker.yamenData = item;
            allMarkers.push(marker);
            markersLayer.addLayer(marker);
        });
        applyFilter(); // 初始筛选
    }

    // 筛选功能
    function applyFilter() {
        const showFu = document.getElementById('filter-fu').checked;
        const showXian = document.getElementById('filter-xian').checked;
        markersLayer.clearLayers();
        let visible = 0;
        allMarkers.forEach(marker => {
            const level = marker.yamenLevel;
            let keep = (level === "府衙" && showFu) || (level === "县衙" && showXian);
            if (keep) {
                markersLayer.addLayer(marker);
                visible++;
            }
        });
        document.getElementById('stats-info').innerHTML = `📌 当前显示 ${visible} 座衙署 | 总计 ${yamenData.length} 座<br>🏛️ 现存 ${yamenData.filter(d => d.status === '现存').length} 处古建筑群`;
        // 图表数据不随筛选改变，但保持联动
    }

    // 地图定位并打开弹窗
    function flyToYamen(name) {
        const target = yamenData.find(d => d.name === name);
        if (target) {
            map.flyTo([target.lat, target.lng], 12, { duration: 1.2 });
            const marker = allMarkers.find(m => m.yamenName === name);
            if (marker) marker.openPopup();
        }
    }

    // ---------- ECharts 图表 ----------
    let currentChart = null;
    let currentChartType = 'level'; // level, area, era

    // 统计数据函数
    function getLevelStats() {
        const fuCount = yamenData.filter(d => d.level === "府衙").length;
        const xianCount = yamenData.filter(d => d.level === "县衙").length;
        return { 府衙: fuCount, 县衙: xianCount };
    }

    function getAreaStats() {
        return [...yamenData].sort((a, b) => b.area - a.area).map(d => ({ name: d.name, area: d.area, status: d.status }));
    }

    function getEraStats() {
        const eraMap = new Map();
        yamenData.forEach(d => {
            let era = d.eraGroup;
            if (!eraMap.has(era)) eraMap.set(era, 0);
            eraMap.set(era, eraMap.get(era) + 1);
        });
        const order = ["元代", "明代", "清代", "明清重建"];
        const sorted = Array.from(eraMap.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
        return sorted.map(([era, count]) => ({ era, count }));
    }

    function renderLevelChart() {
        const stats = getLevelStats();
        const option = {
            title: { text: '衙署等级分布', left: 'center', top: 0, textStyle: { fontSize: 14, fontWeight: 'normal', color: '#6b2e1a' } },
            tooltip: { trigger: 'item', formatter: '{b}: {d}% ({c}座)' },
            series: [{
                name: '衙署等级', type: 'pie', radius: '55%', center: ['50%', '55%'],
                data: [
                    { value: stats.府衙, name: '府衙', itemStyle: { color: '#aa4a2e' } },
                    { value: stats.县衙, name: '县衙', itemStyle: { color: '#528a3e' } }
                ],
                label: { show: true, formatter: '{b}: {d}%' },
                emphasis: { scale: true }
            }]
        };
        currentChart.setOption(option, true);
    }

    function renderAreaChart() {
        const areaData = getAreaStats();
        const option = {
            title: { text: '衙署占地面积对比 (㎡)', left: 'center', top: 0, textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => `${params[0].name}<br/>占地面积: ${params[0].value.toLocaleString()} ㎡` },
            grid: { top: 50, bottom: 30, left: 70, right: 20, containLabel: true },
            xAxis: { type: 'value', name: '占地面积 (㎡)', nameLocation: 'middle', nameGap: 30 },
            yAxis: { type: 'category', data: areaData.map(d => d.name), axisLabel: { rotate: 0, fontSize: 11, fontWeight: 'bold', interval: 0 } },
            series: [{
                name: '占地面积', type: 'bar', data: areaData.map(d => d.area),
                itemStyle: { color: (params) => areaData[params.dataIndex].status === '现存' ? '#c97e5a' : '#bc9a6c', borderRadius: [0, 6, 6, 0] },
                label: { show: true, position: 'right', formatter: (p) => `${p.value.toLocaleString()}㎡` }
            }]
        };
        currentChart.setOption(option, true);
        // 绑定点击事件
        currentChart.off('click');
        currentChart.on('click', (params) => {
            if (params.componentType === 'series' && params.dataIndex !== undefined) {
                const name = areaData[params.dataIndex].name;
                flyToYamen(name);
            }
        });
    }

    function renderEraChart() {
        const eraStats = getEraStats();
        const option = {
            title: { text: '衙署始建年代分布', left: 'center', top: 0, textStyle: { fontSize: 14 } },
            tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: '{b}<br/>衙署数量: {c} 座' },
            grid: { top: 50, bottom: 20, left: 50, right: 20 },
            xAxis: { type: 'category', data: eraStats.map(e => e.era), name: '年代', axisLabel: { rotate: 0 } },
            yAxis: { type: 'value', name: '衙署数量 (座)', min: 0, interval: 1 },
            series: [{
                name: '数量', type: 'bar', data: eraStats.map(e => e.count),
                itemStyle: { color: '#b17b4b', borderRadius: [6, 6, 0, 0] },
                label: { show: true, position: 'top' }
            }]
        };
        currentChart.setOption(option, true);
        currentChart.off('click'); // 年代图表无联动
    }

    function renderActiveChart() {
        if (!currentChart) return;
        if (currentChartType === 'level') renderLevelChart();
        else if (currentChartType === 'area') renderAreaChart();
        else if (currentChartType === 'era') renderEraChart();
    }

    // 初始化图表
    function initCharts() {
        const chartDom = document.getElementById('chart-box');
        if (chartDom && typeof echarts !== 'undefined') {
            currentChart = echarts.init(chartDom);
            renderActiveChart();
            window.addEventListener('resize', () => currentChart && currentChart.resize());
        } else {
            console.error('ECharts 未加载或图表容器不存在');
        }
    }

    // 选项卡切换
    function bindTabs() {
        const btns = document.querySelectorAll('.tab-btn');
        btns.forEach(btn => {
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentChartType = btn.getAttribute('data-chart');
                renderActiveChart();
            });
        });
    }

    // 绑定筛选事件
    document.getElementById('filter-fu').addEventListener('change', applyFilter);
    document.getElementById('filter-xian').addEventListener('change', applyFilter);

    // 启动
    initMarkers();
    initCharts();
    bindTabs();
    applyFilter(); // 更新统计信息
});