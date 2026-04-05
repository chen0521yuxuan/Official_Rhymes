// 等待 Leaflet 加载完成
(function() {
    if (typeof L === 'undefined') {
        console.error('Leaflet 库未加载，请检查网络连接或 CDN 地址');
        alert('地图库加载失败，请刷新页面或检查网络。');
        return;
    }

    // 地图边界（河南省范围）
    const southWest = L.latLng(31.3, 110.3);
    const northEast = L.latLng(36.5, 116.8);
    const bounds = L.latLngBounds(southWest, northEast);

    // 创建地图对象并挂载到 window 全局，供其他模块使用
    window.map = L.map('map').setView([33.9, 113.4], 7);
    map.setMaxBounds(bounds);
    map.setMinZoom(6.5);
    map.setMaxZoom(12);

    // 标准地图底图（请确保 assets/map-bg.jpg 存在）
    const standardMapImage = "assets/map-bg.jpg";
    const imageOverlay = L.imageOverlay(standardMapImage, bounds, {
        opacity: 0.92,
        attribution: '底图审图号：GS（2023）1267号'
    }).addTo(map);

    // 底图加载失败提示
    imageOverlay.on('loaderror', () => {
        console.warn("⚠️ 标准地图图片未正确加载，请确保 assets/map-bg.jpg 存在并替换为官方标准地图图片");
        // 添加一个半透明底色，避免完全空白
        L.rectangle(bounds, { color: "#b58b5a", weight: 1, fillOpacity: 0.1, fillColor: "#f8edd9" }).addTo(map);
    });

    // 添加边框
    L.rectangle(bounds, { color: "#c29a6b", weight: 2, fill: false }).addTo(map);

    // 比例尺
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
})();
window.imageOverlay = imageOverlay;