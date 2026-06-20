// ==================== 全局变量定义 ====================

// 自定义配置
let autoLoadEnabled = true;

// 漫画相关数据
let comics = [];                          // 所有漫画列表
let currentComic = null;                  // 当前正在阅读的漫画
let currentImageIndex = 0;                // 当前显示的图片索引
let currentImages = [];                   // 当前漫画的所有图片
let currentComicIndex = 0;                // 当前漫画在列表中的索引

// 音频相关数据
let currentAlbum = null;                  // 当前正在播放的专辑
let currentTrackIndex = 0;                // 当前播放的曲目索引
let currentTracks = [];                   // 当前专辑的所有曲目
let currentAlbumIndex = 0;                // 当前专辑在列表中的索引
let albums = [];                          // 所有专辑列表

// 视频相关数据
let videos = [];                          // 所有视频列表
let currentVideoIndex = 0;                // 当前视频索引
let videoLoop = false;                    // 是否循环播放当前视频
let videoAutoNext = false;                // 是否自动播放下一个视频

// 应用状态
let currentMode = 'comic';                // 当前模式：'comic'（漫画）或 'audio'（音频）或 'video'（视频）
let audio = null;                         // Audio 对象实例
let videoElement = null;                  // Video 对象实例
let isPlaying = false;                    // 音频播放状态
let hideControlsTimeout = null;           // 自动隐藏控制元素的定时器
const CONTROLS_HIDE_DELAY = 2000;         // 控制元素自动隐藏延迟（毫秒）

// 图片缩放和拖动相关变量
let imageScale = 1;                       // 当前缩放比例
let imageOffsetX = 0;                     // 图片水平偏移
let imageOffsetY = 0;                     // 图片垂直偏移
let isDragging = false;                   // 是否正在拖动
let dragStartX = 0;                       // 拖动起始 X 坐标
let dragStartY = 0;                       // 拖动起始 Y 坐标
let dragStartOffsetX = 0;                 // 拖动起始时的水平偏移
let dragStartOffsetY = 0;                 // 拖动起始时的垂直偏移

// 音频可视化相关变量
let audioContext = null;                  // 音频上下文
let analyser = null;                      // 分析器节点
let audioSource = null;                   // 音频源节点
let visualizerCanvas = null;              // 可视化 Canvas 元素
let visualizerCtx = null;                 // Canvas 2D 上下文
let animationId = null;                    // 动画帧 ID
let dataArray = null;                      // 音频数据数组

// ==================== DOM 元素获取 ====================

// 界面元素
const importBtn = document.getElementById('importBtn');
const dropdownMenu = document.getElementById('dropdownMenu');
const fileTreeEl = document.getElementById('fileTree');
const viewerEl = document.getElementById('viewer');
const noContentEl = document.getElementById('noContent');
const viewerImageEl = document.getElementById('viewerImage');
const viewerInfoEl = document.getElementById('viewerInfo');
const navHintEl = document.getElementById('navHint');
const navLeftBtn = document.getElementById('navLeftBtn');
const navRightBtn = document.getElementById('navRightBtn');
const resetBtn = document.getElementById('resetBtn');
const imageContainerEl = document.getElementById('imageContainer');

// 下拉菜单状态
let isDropdownOpen = false;

// 音频播放器元素
const audioPlayerEl = document.getElementById('audioPlayer');
const audioTitleEl = document.getElementById('audioTitle');
const audioAlbumEl = document.getElementById('audioAlbum');
const audioPlayPauseBtn = document.getElementById('audioPlayPause');
const audioPrevBtn = document.getElementById('audioPrev');
const audioNextBtn = document.getElementById('audioNext');
const progressBarEl = document.getElementById('progressBar');
const progressFillEl = document.getElementById('progressFill');
const progressHandleEl = document.getElementById('progressHandle');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const audioVolumeEl = document.getElementById('audioVolume');
const coverImageEl = document.getElementById('coverImage');
const audioIconEl = document.getElementById('audioIcon');
const visualizerCanvasEl = document.getElementById('audioVisualizer');

// 视频播放器元素
const videoPlayerEl = document.getElementById('videoPlayer');
const videoElementEl = document.getElementById('videoElement');
const videoControlsEl = document.getElementById('videoControls');
const videoPlayPauseBtn = document.getElementById('videoPlayPause');
const videoPrevBtn = document.getElementById('videoPrev');
const videoNextBtn = document.getElementById('videoNext');
const videoProgressBarEl = document.getElementById('videoProgressBar');
const videoProgressFillEl = document.getElementById('videoProgressFill');
const videoTimeEl = document.getElementById('videoTime');
const videoVolumeEl = document.getElementById('videoVolume');
const videoLoopBtnEl = document.getElementById('videoLoopBtn');
const videoAutoNextBtnEl = document.getElementById('videoAutoNextBtn');

// ==================== 事件监听器 ====================

// 导入菜单事件
importBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isDropdownOpen = !isDropdownOpen;
    dropdownMenu.classList.toggle('show', isDropdownOpen);
});

dropdownMenu.addEventListener('click', async (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item || item.classList.contains('disabled')) return;
    
    const type = item.dataset.type;
    isDropdownOpen = false;
    dropdownMenu.classList.remove('show');
    
    switch (type) {
        case 'image':
            await importImages();
            break;
        case 'music':
            await importMusic();
            break;
        case 'video':
            await importVideo();
            break;
    }
});

document.addEventListener('click', () => {
    if (isDropdownOpen) {
        isDropdownOpen = false;
        dropdownMenu.classList.remove('show');
    }
});

// 翻页按钮事件
navLeftBtn.addEventListener('click', async () => {
    await prevPage();
});

navRightBtn.addEventListener('click', async () => {
    await nextPage();
});

resetBtn.addEventListener('click', () => {
    imageScale = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;
    updateImageTransform();
    showControls();
});

// 鼠标拖动事件
imageContainerEl.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !viewerImageEl.src) return;
    e.preventDefault();
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartOffsetX = imageOffsetX;
    dragStartOffsetY = imageOffsetY;
    viewerImageEl.classList.add('dragging');
    imageContainerEl.classList.add('dragging');
    showControls();
});

document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartX;
    const deltaY = e.clientY - dragStartY;
    
    imageOffsetX = dragStartOffsetX + deltaX;
    imageOffsetY = dragStartOffsetY + deltaY;
    
    updateImageTransform();
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        viewerImageEl.classList.remove('dragging');
        imageContainerEl.classList.remove('dragging');
    }
});

// 滚轮缩放事件
imageContainerEl.addEventListener('wheel', (e) => {
    if (!viewerImageEl.src) return;
    
    e.preventDefault();
    
    const rect = imageContainerEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newScale = Math.max(0.5, Math.min(3, imageScale + delta));
    
    if (newScale !== imageScale) {
        const scaleDiff = newScale / imageScale;
        imageOffsetX = mouseX - (mouseX - imageOffsetX) * scaleDiff;
        imageOffsetY = mouseY - (mouseY - imageOffsetY) * scaleDiff;
        imageScale = newScale;
        
        updateImageTransform();
        showControls();
    }
}, { passive: false });

// ==================== 导入功能函数 ====================

async function importImages() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        console.log('导入图片:', dirHandle);
        fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">加载中...</div>';
        await loadComics(dirHandle);
        await saveFolderHandle(dirHandle);
    } catch (err) {
        console.error('导入图片失败:', err);
        if (err.name !== 'AbortError') {
            fileTreeEl.innerHTML = `<div class="no-content" style="padding: 20px;">
                错误：${err.message}<br><br>
                请确保使用 Chrome 或 Edge 浏览器，并且授予了文件夹访问权限。
            </div>`;
        }
    }
}

async function importMusic() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        console.log('导入音乐:', dirHandle);
        fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">加载中...</div>';
        await loadMusic(dirHandle);
    } catch (err) {
        console.error('导入音乐失败:', err);
        if (err.name !== 'AbortError') {
            fileTreeEl.innerHTML = `<div class="no-content" style="padding: 20px;">
                错误：${err.message}<br><br>
                请确保使用 Chrome 或 Edge 浏览器，并且授予了文件夹访问权限。
            </div>`;
        }
    }
}

async function loadMusic(dirHandle) {
    comics = [];
    albums = [];

    const audioDirs = await findAudioDirsRecursive(dirHandle, '');

    for (const album of audioDirs) {
        albums.push({
            name: album.name,
            handle: album.handle,
            tracks: album.tracks,
            cover: album.cover
        });
    }
    
    albums.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    renderFileTree();
}

async function importVideo() {
    try {
        const dirHandle = await window.showDirectoryPicker();
        console.log('导入视频:', dirHandle);
        fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">扫描中...</div>';
        
        videos = [];
        await scanVideoFiles(dirHandle, '');
        
        if (videos.length === 0) {
            fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">未找到视频文件</div>';
            return;
        }
        
        renderVideoList();
        
        if (videos.length > 0) {
            await playVideo(0);
        }
        
    } catch (err) {
        console.error('导入视频失败:', err);
        if (err.name !== 'AbortError') {
            fileTreeEl.innerHTML = `<div class="no-content" style="padding: 20px;">
                错误：${err.message}
            </div>`;
        }
    }
}

async function scanVideoFiles(dirHandle, parentPath) {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.wmv'];
    
    for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
            const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
            if (videoExtensions.includes(ext)) {
                videos.push({
                    name: entry.name,
                    handle: entry
                });
            }
        } else if (entry.kind === 'directory') {
            await scanVideoFiles(entry, parentPath + '/' + entry.name);
        }
    }
}

function renderVideoList() {
    let html = '<div class="section-header">🎬 视频列表</div>';
    html += videos.map((video, index) => `
        <div class="video-item ${index === currentVideoIndex ? 'active' : ''}" data-index="${index}">
            🎬 ${video.name}
        </div>
    `).join('');
    
    fileTreeEl.innerHTML = html;
    
    document.querySelectorAll('.video-item').forEach(item => {
        item.addEventListener('click', async () => {
            const index = parseInt(item.dataset.index);
            await playVideo(index);
        });
    });
}

async function playVideo(index) {
    if (index < 0 || index >= videos.length) return;
    
    currentVideoIndex = index;
    const video = videos[index];
    
    currentMode = 'video';
    
    const file = await video.handle.getFile();
    const url = URL.createObjectURL(file);
    
    if (!videoElement) {
        videoElement = document.getElementById('videoElement');
    }
    videoElement.src = url;
    
    document.getElementById('videoProgressFill').style.width = '0%';
    document.getElementById('videoTime').textContent = '0:00 / 0:00';
    
    videoElement.style.display = 'block';
    document.getElementById('videoPlayer').style.display = 'flex';
    noContentEl.style.display = 'none';
    
    document.getElementById('imageContainer').style.display = 'none';
    audioPlayerEl.style.display = 'none';
    
    document.querySelectorAll('.video-item').forEach((item, i) => {
        item.classList.toggle('active', i === index);
    });
    
    viewerInfoEl.textContent = `${video.name} (${index + 1}/${videos.length})`;
    
    videoElement.play().then(() => {
        document.getElementById('videoPlayPause').textContent = '⏸';
    }).catch(err => {
        console.log('自动播放失败:', err);
    });
    
    showControls();
}

// ==================== 核心功能函数 ====================

async function loadComics(dirHandle) {
    comics = [];
    comics = await findImageDirsRecursive(dirHandle, new Set(), '');
    comics.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    renderFileTree();
}

async function loadMedia(dirHandle) {
    comics = [];
    albums = [];

    const audioDirs = await findAudioDirsRecursive(dirHandle, '');
    const audioDirPaths = new Set(audioDirs.map(a => a.path));

    comics = await findImageDirsRecursive(dirHandle, audioDirPaths, '');

    comics.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const album of audioDirs) {
        albums.push({
            name: album.name,
            handle: album.handle,
            tracks: album.tracks,
            cover: album.cover
        });
    }
    albums.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    renderFileTree();
}

async function findImageDirsRecursive(rootHandle, audioDirPaths = new Set(), parentPath = '') {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const zipExtensions = ['.zip', '.cbz'];
    const results = [];

    async function scan(dirHandle, currentPath) {
        const dirPath = currentPath ? currentPath + '/' + dirHandle.name : dirHandle.name;
        
        if (audioDirPaths.has(dirPath)) {
            return;
        }

        let imagesInThisDir = [];
        const subdirs = [];
        const zipFiles = [];

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
                if (imageExtensions.includes(ext)) {
                    imagesInThisDir.push({
                        name: entry.name,
                        handle: entry
                    });
                } else if (zipExtensions.includes(ext)) {
                    zipFiles.push({
                        name: entry.name,
                        handle: entry
                    });
                }
            } else if (entry.kind === 'directory') {
                subdirs.push(entry);
            }
        }

        if (imagesInThisDir.length > 0) {
            imagesInThisDir.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            results.push({
                name: dirHandle.name,
                handle: dirHandle,
                images: imagesInThisDir
            });
        }

        for (const zipFile of zipFiles) {
            const comicName = zipFile.name.replace(/\.(zip|cbz)$/i, '');
            results.push({
                name: comicName,
                handle: zipFile.handle,
                images: [],
                isZip: true
            });
        }

        for (const subdir of subdirs) {
            await scan(subdir, dirPath);
        }
    }

    await scan(rootHandle, parentPath);
    return results;
}

async function findAudioDirsRecursive(rootHandle, parentPath = '') {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.wma'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const results = [];

    async function scan(dirHandle, currentPath) {
        const dirPath = currentPath ? currentPath + '/' + dirHandle.name : dirHandle.name;
        
        let tracksInThisDir = [];
        let cover = null;
        const subdirs = [];

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
                if (audioExtensions.includes(ext)) {
                    tracksInThisDir.push({
                        name: entry.name.replace(/\.[^.]+$/, ''),
                        fullName: entry.name,
                        handle: entry
                    });
                } else if (imageExtensions.includes(ext) && !cover) {
                    cover = {
                        name: entry.name,
                        handle: entry
                    };
                }
            } else if (entry.kind === 'directory') {
                subdirs.push(entry);
            }
        }

        if (tracksInThisDir.length > 0) {
            tracksInThisDir.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            results.push({
                name: dirHandle.name,
                handle: dirHandle,
                tracks: tracksInThisDir,
                cover: cover,
                path: dirPath
            });
        }

        for (const subdir of subdirs) {
            await scan(subdir, dirPath);
        }
    }

    await scan(rootHandle, parentPath);
    return results;
}

function renderFileTree() {
    let html = '';

    if (comics.length > 0) {
        html += '<div class="section-header">📖 漫画</div>';
        html += comics.map((comic, comicIndex) => {
            const icon = comic.isZip ? '📦' : '📁';
            return `
                <div class="comic-item ${comicIndex === currentComicIndex ? 'active' : ''}" data-comic-index="${comicIndex}">
                    ${icon} ${comic.name}
                </div>
            `;
        }).join('');
    }

    if (albums.length > 0) {
        html += '<div class="section-header">🎵 音乐专辑</div>';
        html += albums.map((album, albumIndex) => `
            <div class="comic-folder album-folder" data-album-index="${albumIndex}">
                <div class="comic-title album-title">${album.name}</div>
                <div class="chapters">
                    ${album.tracks.map((track, trackIndex) => `
                        <div class="chapter track" data-album-index="${albumIndex}" data-track-index="${trackIndex}">
                            ${track.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    if (comics.length === 0 && albums.length === 0) {
        html = '<div class="no-content" style="padding: 20px;">未找到漫画或音频文件夹</div>';
    }

    fileTreeEl.innerHTML = html;

    document.querySelectorAll('.comic-item').forEach(item => {
        item.addEventListener('click', async (e) => {
            const comicIndex = parseInt(e.target.dataset.comicIndex);
            await openComic(comicIndex);
        });
    });

    document.querySelectorAll('.album-title').forEach(title => {
        title.addEventListener('click', (e) => {
            const folder = e.target.closest('.album-folder');
            folder.classList.toggle('open');
        });
    });

    document.querySelectorAll('.track').forEach(track => {
        track.addEventListener('click', async (e) => {
            const albumIndex = parseInt(e.target.dataset.albumIndex);
            const trackIndex = parseInt(e.target.dataset.trackIndex);
            await openAlbum(albumIndex, trackIndex);
        });
    });
}

// ==================== 漫画阅读功能 ====================

function showControls() {
    if (hideControlsTimeout) {
        clearTimeout(hideControlsTimeout);
    }
    
    navHintEl.classList.remove('hidden');
    viewerInfoEl.classList.remove('hidden');
    navLeftBtn.classList.remove('hidden');
    navRightBtn.classList.remove('hidden');
    resetBtn.classList.remove('hidden');
    navLeftBtn.style.display = 'flex';
    navRightBtn.style.display = 'flex';
    resetBtn.style.display = 'flex';
    
    hideControlsTimeout = setTimeout(() => {
        hideControls();
    }, CONTROLS_HIDE_DELAY);
}

function hideControls() {
    navHintEl.classList.add('hidden');
    viewerInfoEl.classList.add('hidden');
    navLeftBtn.classList.add('hidden');
    navRightBtn.classList.add('hidden');
    resetBtn.classList.add('hidden');
}

function updateImageTransform() {
    viewerImageEl.style.transform = `translate(${imageOffsetX}px, ${imageOffsetY}px) scale(${imageScale})`;
}

async function openComic(comicIndex) {
    stopAudio();
    
    currentMode = 'comic';
    currentComicIndex = comicIndex;
    currentComic = comics[comicIndex];
    currentImageIndex = 0;
    
    if (currentComic.isZip && currentComic.images.length === 0) {
        fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">解压中...</div>';
        
        try {
            const file = await currentComic.handle.getFile();
            const zip = await JSZip.loadAsync(file);
            
            const images = [];
            const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
            
            for (const [path, zipFile] of Object.entries(zip.files)) {
                if (zipFile.dir) continue;
                
                const ext = path.toLowerCase().substring(path.lastIndexOf('.'));
                if (imageExtensions.includes(ext)) {
                    images.push({
                        name: path,
                        file: zipFile
                    });
                }
            }
            
            images.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            
            currentComic.images = images;
            currentImages = images;
            
            renderFileTree();
            
            const comicEl = document.querySelector(`.comic-item[data-comic-index="${comicIndex}"]`);
            if (comicEl) {
                comicEl.classList.add('active');
            }
            
        } catch (err) {
            console.error('解压 ZIP 失败:', err);
            fileTreeEl.innerHTML = `<div class="no-content" style="padding: 20px;">
                解压失败：${err.message}
            </div>`;
            return;
        }
    } else {
        currentImages = currentComic.images;
    }

    document.querySelectorAll('.comic-item').forEach(el => el.classList.remove('active'));
    const comicEl = document.querySelector(`.comic-item[data-comic-index="${comicIndex}"]`);
    if (comicEl) {
        comicEl.classList.add('active');
    }

    audioPlayerEl.style.display = 'none';
    videoPlayerEl.style.display = 'none';
    document.querySelector('.image-container').style.display = 'flex';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'flex');
    resetBtn.style.display = 'flex';
    await showImage();
}

async function showImage() {
    if (currentImages.length === 0) return;

    const image = currentImages[currentImageIndex];
    let url;
    
    if (image.file) {
        const blob = await image.file.async('blob');
        url = URL.createObjectURL(blob);
    } else {
        const file = await image.handle.getFile();
        url = URL.createObjectURL(file);
    }

    imageScale = 1;
    imageOffsetX = 0;
    imageOffsetY = 0;

    viewerImageEl.src = url;
    viewerImageEl.style.display = 'block';
    viewerImageEl.draggable = false;
    noContentEl.style.display = 'none';
    showControls();
    viewerInfoEl.textContent = `${currentComic.name} - ${currentImageIndex + 1}/${currentImages.length}`;
}

async function nextPage() {
    if (!currentComic || currentImages.length === 0) return;
    
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        await showImage();
    } else if (currentComicIndex < comics.length - 1) {
        await openComic(currentComicIndex + 1);
    }
}

async function prevPage() {
    if (!currentComic || currentImages.length === 0) return;
    
    if (currentImageIndex > 0) {
        currentImageIndex--;
        await showImage();
    } else if (currentComicIndex > 0) {
        const newComicIndex = currentComicIndex - 1;
        await openComic(newComicIndex);
        currentImageIndex = comics[newComicIndex].images.length - 1;
        await showImage();
    }
}

async function nextComic() {
    if (!currentComic || comics.length === 0) return;
    
    const newComicIndex = (currentComicIndex + 1) % comics.length;
    await openComic(newComicIndex);
}

async function prevComic() {
    if (!currentComic || comics.length === 0) return;
    
    const newComicIndex = (currentComicIndex - 1 + comics.length) % comics.length;
    await openComic(newComicIndex);
}

// ==================== 音频播放功能 ====================

async function openAlbum(albumIndex, trackIndex) {
    stopAudio();
    
    currentMode = 'audio';
    currentAlbumIndex = albumIndex;
    currentTrackIndex = trackIndex;
    currentAlbum = albums[albumIndex];
    currentTracks = currentAlbum.tracks;

    document.querySelectorAll('.chapter').forEach(el => el.classList.remove('active'));
    const trackEl = document.querySelector(`.chapter[data-album-index="${albumIndex}"][data-track-index="${trackIndex}"]`);
    if (trackEl) {
        trackEl.classList.add('active');
        const albumFolder = trackEl.closest('.comic-folder');
        if (albumFolder) albumFolder.classList.add('open');
    }

    viewerImageEl.style.display = 'none';
    viewerInfoEl.style.display = 'none';
    navHintEl.style.display = 'none';
    noContentEl.style.display = 'none';
    document.querySelector('.image-container').style.display = 'none';
    document.querySelectorAll('.nav-btn').forEach(btn => btn.style.display = 'none');
    resetBtn.style.display = 'none';
    videoPlayerEl.style.display = 'none';
    audioPlayerEl.style.display = 'flex';

    initAudioVisualizer();

    if (currentAlbum.cover) {
        const file = await currentAlbum.cover.handle.getFile();
        const url = URL.createObjectURL(file);
        coverImageEl.src = url;
        coverImageEl.style.display = 'block';
        audioIconEl.style.display = 'none';
    } else {
        coverImageEl.style.display = 'none';
        audioIconEl.style.display = 'block';
    }

    await loadAndPlayTrack(currentTrackIndex);
}

async function readAudioCover(file) {
    const fileName = file.name.toLowerCase();
    console.log('尝试读取封面:', fileName);
    
    if (fileName.endsWith('.flac')) {
        await readFlacCover(file);
        return;
    }
    
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const tags = tag.tags;
            console.log('jsmediatags 成功:', fileName, tags);
            
            let picture = null;
            if (tags.picture) {
                picture = tags.picture;
            } else if (tags.APIC) {
                picture = tags.APIC;
            }
            
            if (picture) {
                const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(picture.data)));
                const mimeType = picture.format || picture.data ? 'image/jpeg' : 'image/jpeg';
                const imageUrl = `data:${mimeType};base64,${base64}`;
                
                console.log('找到封面:', mimeType, picture.data ? picture.data.length + ' bytes' : 'no data');
                
                coverImageEl.src = imageUrl;
                coverImageEl.style.display = 'block';
                audioIconEl.style.display = 'none';
            } else {
                console.log('没有找到封面标签');
            }
        },
        onError: function(error) {
            console.log('读取封面失败:', fileName, error);
        }
    });
}

async function readFlacCover(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        console.log('FLAC 文件大小:', bytes.length, 'bytes');
        
        if (bytes[0] !== 0x66 || bytes[1] !== 0x4C || bytes[2] !== 0x61 || bytes[3] !== 0x43) {
            console.log('不是有效的 FLAC 文件');
            return;
        }
        
        let offset = 4;
        let blockCount = 0;
        
        while (offset < bytes.length) {
            blockCount++;
            const blockHeader = bytes[offset];
            const isLast = (blockHeader & 0x80) !== 0;
            const blockType = blockHeader & 0x7F;
            const blockLength = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
            
            console.log(`Block ${blockCount}: type=${blockType}, length=${blockLength}, isLast=${isLast}`);
            
            offset += 4;
            
            if (blockType === 6) {
                console.log('找到 PICTURE block!');
                const pictureData = bytes.slice(offset, offset + blockLength);
                const picture = parseFlacPicture(pictureData);
                
                if (picture) {
                    console.log('解析图片成功:', picture.mimeType, picture.data.length, 'bytes');
                    const blob = new Blob([picture.data], { type: picture.mimeType });
                    const imageUrl = URL.createObjectURL(blob);
                    
                    coverImageEl.src = imageUrl;
                    coverImageEl.style.display = 'block';
                    audioIconEl.style.display = 'none';
                    return;
                }
            }
            
            offset += blockLength;
            
            if (isLast) break;
        }
        console.log('未找到 PICTURE block，共扫描了', blockCount, '个 blocks');
    } catch (error) {
        console.log('读取 FLAC 封面失败:', error);
    }
}

function parseFlacPicture(data) {
    try {
        let offset = 0;
        
        offset += 4;
        
        const mimeLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
        offset += 4;
        
        const mimeType = String.fromCharCode.apply(null, data.slice(offset, offset + mimeLength));
        offset += mimeLength;
        
        const descLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
        offset += 4 + descLength;
        
        offset += 4 * 4;
        
        const imageLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
        offset += 4;
        
        const imageData = data.slice(offset, offset + imageLength);
        
        return {
            mimeType: mimeType,
            data: imageData
        };
    } catch (error) {
        console.log('解析 PICTURE block 失败:', error);
        return null;
    }
}

async function loadAndPlayTrack(trackIndex) {
    if (trackIndex < 0 || trackIndex >= currentTracks.length) return;
    
    currentTrackIndex = trackIndex;
    const track = currentTracks[trackIndex];
    
    audioTitleEl.textContent = track.name;
    audioAlbumEl.textContent = currentAlbum.name;
    
    if (audio) {
        audio.pause();
        audio = null;
    }

    const file = await track.handle.getFile();
    const url = URL.createObjectURL(file);
    
    audio = new Audio(url);
    audio.volume = audioVolumeEl.value / 100;
    
    readAudioCover(file);
    
    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });
    
    audio.addEventListener('timeupdate', updateProgress);
    
    audio.addEventListener('ended', () => {
        nextTrack();
    });
    
    audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        alert(`无法播放 "${track.name}"\n\n原因：浏览器不支持此音频格式。\n\n请使用 MP3、M4A、OGG、WAV 或 FLAC 格式的音频文件。`);
        audio = null;
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
    });
    
    try {
        await audio.play();
        isPlaying = true;
        audioPlayPauseBtn.textContent = '⏸';
        connectAudioToVisualizer();
    } catch (err) {
        console.error('Playback failed:', err);
        alert(`播放失败: ${err.message}\n\n可能的原因：\n- 浏览器不支持此音频格式\n- 需要用户交互才能播放`);
        audio = null;
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
    }
    
    document.querySelectorAll('.chapter').forEach(el => el.classList.remove('active'));
    const trackEl = document.querySelector(`.chapter[data-album-index="${currentAlbumIndex}"][data-track-index="${currentTrackIndex}"]`);
    if (trackEl) trackEl.classList.add('active');
}

function playAudio() {
    if (audio && !isPlaying) {
        audio.play();
        isPlaying = true;
        audioPlayPauseBtn.textContent = '⏸';
        startVisualizerAnimation();
    }
}

function pauseAudio() {
    if (audio && isPlaying) {
        audio.pause();
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
        stopVisualizerAnimation();
    }
}

function stopAudio() {
    stopVisualizerAnimation();
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
    }
    isPlaying = false;
    audioPlayPauseBtn.textContent = '▶';
}

function nextTrack() {
    if (currentTrackIndex < currentTracks.length - 1) {
        loadAndPlayTrack(currentTrackIndex + 1);
    } else if (currentAlbumIndex < albums.length - 1) {
        openAlbum(currentAlbumIndex + 1, 0);
    }
}

function prevTrack() {
    if (currentTrackIndex > 0) {
        loadAndPlayTrack(currentTrackIndex - 1);
    } else if (currentAlbumIndex > 0) {
        const prevAlbum = albums[currentAlbumIndex - 1];
        openAlbum(currentAlbumIndex - 1, prevAlbum.tracks.length - 1);
    }
}

function updateProgress() {
    if (!audio) return;
    
    const progress = (audio.currentTime / audio.duration) * 100;
    progressFillEl.style.width = `${progress}%`;
    progressHandleEl.style.left = `${progress}%`;
    currentTimeEl.textContent = formatTime(audio.currentTime);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekTo(e) {
    if (!audio) return;
    
    const rect = progressBarEl.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

// ==================== 播放器控制事件 ====================

audioPlayPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
});

audioPrevBtn.addEventListener('click', () => {
    if (currentMode === 'audio') {
        prevTrack();
    }
});

audioNextBtn.addEventListener('click', () => {
    if (currentMode === 'audio') {
        nextTrack();
    }
});

progressBarEl.addEventListener('click', seekTo);

audioVolumeEl.addEventListener('input', () => {
    if (audio) {
        audio.volume = audioVolumeEl.value / 100;
    }
});

// ==================== 视频播放器事件 ====================

videoPlayPauseBtn.addEventListener('click', () => {
    if (videoElement.paused) {
        videoElement.play();
        videoPlayPauseBtn.textContent = '⏸';
    } else {
        videoElement.pause();
        videoPlayPauseBtn.textContent = '▶';
    }
});

videoElementEl.addEventListener('click', () => {
    if (videoElement.paused) {
        videoElement.play();
        videoPlayPauseBtn.textContent = '⏸';
    } else {
        videoElement.pause();
        videoPlayPauseBtn.textContent = '▶';
    }
});

videoElementEl.addEventListener('timeupdate', () => {
    if (videoElement.duration) {
        const percent = (videoElement.currentTime / videoElement.duration) * 100;
        videoProgressFillEl.style.width = percent + '%';
        videoTimeEl.textContent = `${formatTime(videoElement.currentTime)} / ${formatTime(videoElement.duration)}`;
    }
});

videoElementEl.addEventListener('ended', () => {
    if (videoLoop) {
        videoElement.currentTime = 0;
        videoElement.play();
    } else if (videoAutoNext && currentVideoIndex < videos.length - 1) {
        playVideo(currentVideoIndex + 1);
    } else {
        videoPlayPauseBtn.textContent = '▶';
    }
});

videoProgressBarEl.addEventListener('click', (e) => {
    const rect = videoProgressBarEl.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoElement.currentTime = videoElement.duration * percent;
});

videoVolumeEl.addEventListener('input', () => {
    videoElement.volume = videoVolumeEl.value / 100;
});

videoPlayerEl.addEventListener('mousemove', () => {
    if (currentMode === 'video') {
        videoControlsEl.classList.remove('hidden');
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(() => {
            videoControlsEl.classList.add('hidden');
        }, CONTROLS_HIDE_DELAY);
    }
});

videoPrevBtn.addEventListener('click', () => {
    if (currentVideoIndex > 0) {
        playVideo(currentVideoIndex - 1);
    }
});

videoNextBtn.addEventListener('click', () => {
    if (currentVideoIndex < videos.length - 1) {
        playVideo(currentVideoIndex + 1);
    }
});

videoLoopBtnEl.addEventListener('click', () => {
    videoLoop = !videoLoop;
    videoLoopBtnEl.classList.toggle('active', videoLoop);
    if (videoLoop && videoAutoNext) {
        videoAutoNext = false;
        videoAutoNextBtnEl.classList.remove('active');
    }
});

videoAutoNextBtnEl.addEventListener('click', () => {
    videoAutoNext = !videoAutoNext;
    videoAutoNextBtnEl.classList.toggle('active', videoAutoNext);
    if (videoAutoNext && videoLoop) {
        videoLoop = false;
        videoLoopBtnEl.classList.remove('active');
    }
});

// ==================== 键盘快捷键 ====================

document.addEventListener('keydown', (e) => {
    if (currentMode === 'audio') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            nextTrack();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevTrack();
        } else if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (isPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
        }
    } else if (currentMode === 'video') {
        if (e.ctrlKey && e.key === 'ArrowRight') {
            e.preventDefault();
            if (currentVideoIndex < videos.length - 1) {
                playVideo(currentVideoIndex + 1);
            }
        } else if (e.ctrlKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            if (currentVideoIndex > 0) {
                playVideo(currentVideoIndex - 1);
            }
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            videoElement.currentTime = Math.min(videoElement.currentTime + 1, videoElement.duration);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            videoElement.currentTime = Math.max(videoElement.currentTime - 1, 0);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            videoElement.volume = Math.min(videoElement.volume + 0.1, 1);
            videoVolumeEl.value = videoElement.volume * 100;
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            videoElement.volume = Math.max(videoElement.volume - 0.1, 0);
            videoVolumeEl.value = videoElement.volume * 100;
        } else if (e.key === ' ') {
            e.preventDefault();
            if (videoElement.paused) {
                videoElement.play();
                videoPlayPauseBtn.textContent = '⏸';
            } else {
                videoElement.pause();
                videoPlayPauseBtn.textContent = '▶';
            }
        }
    } else {
        if (e.ctrlKey && e.key === 'ArrowRight') {
            e.preventDefault();
            nextComic();
        } else if (e.ctrlKey && e.key === 'ArrowLeft') {
            e.preventDefault();
            prevComic();
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevPage();
        }
    }
});

// ==================== 鼠标交互 ====================

viewerEl.addEventListener('mousemove', () => {
    if (currentMode === 'comic' && currentImages.length > 0) {
        showControls();
    }
});

// ==================== 自动载入文件 ====================

const DB_NAME = 'PicLookDB';
const DB_VERSION = 1;
const STORE_NAME = 'folderHandles';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

async function saveFolderHandle(dirHandle) {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(dirHandle, 'lastFolder');
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
            request.onsuccess = () => {
                db.close();
                resolve();
            };
        });
    } catch (err) {
        console.error('保存文件夹句柄失败:', err);
    }
}

async function getFolderHandle() {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('lastFolder');
            request.onerror = () => {
                db.close();
                reject(request.error);
            };
            request.onsuccess = () => {
                db.close();
                resolve(request.result);
            };
        });
    } catch (err) {
        console.error('读取文件夹句柄失败:', err);
        return null;
    }
}

async function autoLoadLastFolder() {
    if (!autoLoadEnabled) return;
    
    try {
        const dirHandle = await getFolderHandle();
        if (!dirHandle) {
            console.log('没有保存的文件夹');
            return;
        }
        
        const permission = await dirHandle.queryPermission({ mode: 'read' });
        if (permission === 'granted') {
            console.log('自动加载上次文件夹:', dirHandle.name);
            fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">加载中...</div>';
            await loadMedia(dirHandle);
        } else {
            const requestPermission = await dirHandle.requestPermission({ mode: 'read' });
            if (requestPermission === 'granted') {
                console.log('重新获得权限，加载文件夹:', dirHandle.name);
                fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">加载中...</div>';
                await loadMedia(dirHandle);
            } else {
                console.log('用户拒绝了文件夹访问权限');
            }
        }
    } catch (err) {
        console.error('自动加载失败:', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded: 尝试自动加载');
    autoLoadLastFolder();
});

// ==================== 音频可视化功能 ====================

function initAudioVisualizer() {
    // 初始化 Canvas
    visualizerCanvas = visualizerCanvasEl;
    visualizerCtx = visualizerCanvas.getContext('2d');
    
    // 设置 Canvas 尺寸
    const rect = visualizerCanvas.getBoundingClientRect();
    visualizerCanvas.width = rect.width * window.devicePixelRatio;
    visualizerCanvas.height = rect.height * window.devicePixelRatio;
    visualizerCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // 初始化音频上下文和分析器
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;  // 设置 FFT 大小，影响频率分辨率
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
    
    // 初始绘制静态波形
    drawStaticWaveform();
}

function connectAudioToVisualizer() {
    if (!audio || !audioContext || !analyser) return;
    
    // 如果音频源已存在，先断开
    if (audioSource) {
        audioSource.disconnect();
    }
    
    // 创建新的音频源并连接到分析器
    audioSource = audioContext.createMediaElementSource(audio);
    audioSource.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // 开始动画
    startVisualizerAnimation();
}

function startVisualizerAnimation() {
    if (!visualizerCtx || !analyser) return;
    
    function draw() {
        animationId = requestAnimationFrame(draw);
        
        // 获取频率数据
        analyser.getByteFrequencyData(dataArray);
        
        // 获取 Canvas 实际尺寸
        const width = visualizerCanvas.width / window.devicePixelRatio;
        const height = visualizerCanvas.height / window.devicePixelRatio;
        
        // 清除画布
        visualizerCtx.clearRect(0, 0, width, height);
        
        // 绘制频谱柱状图
        drawFrequencyBars(width, height);
        
        // 绘制波浪线
        drawWaveform(width, height);
    }
    
    draw();
}

function stopVisualizerAnimation() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // 绘制静态波形
    if (visualizerCtx) {
        drawStaticWaveform();
    }
}

function drawStaticWaveform() {
    if (!visualizerCtx || !visualizerCanvas) return;
    
    const width = visualizerCanvas.width / window.devicePixelRatio;
    const height = visualizerCanvas.height / window.devicePixelRatio;
    
    visualizerCtx.clearRect(0, 0, width, height);
    
    // 绘制底部静态线
    visualizerCtx.beginPath();
    visualizerCtx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
    visualizerCtx.lineWidth = 2;
    visualizerCtx.moveTo(0, height / 2);
    visualizerCtx.lineTo(width, height / 2);
    visualizerCtx.stroke();
}

function drawFrequencyBars(width, height) {
    const barCount = 32;  // 频谱柱数量
    const barWidth = width / barCount - 2;
    const gap = 2;
    
    // 计算每个柱的宽度
    const barAreaWidth = width / barCount;
    
    for (let i = 0; i < barCount; i++) {
        // 从数据数组中获取对应的频率值
        const dataIndex = Math.floor(i * dataArray.length / barCount);
        const value = dataArray[dataIndex];
        
        // 将值映射到高度
        const barHeight = (value / 255) * (height / 2 - 5);
        
        // 顶部柱
        const x = i * barAreaWidth + gap / 2;
        
        // 创建渐变色
        const gradient = visualizerCtx.createLinearGradient(0, height / 2 - barHeight, 0, height / 2 + barHeight);
        gradient.addColorStop(0, 'rgba(155, 89, 182, 0.9)');
        gradient.addColorStop(0.5, 'rgba(142, 68, 173, 0.7)');
        gradient.addColorStop(1, 'rgba(155, 89, 182, 0.9)');
        
        // 绘制顶部柱（向上）
        visualizerCtx.fillStyle = gradient;
        visualizerCtx.fillRect(x, height / 2 - barHeight, barWidth, barHeight);
        
        // 绘制底部柱（向下）
        visualizerCtx.fillRect(x, height / 2, barWidth, barHeight);
        
        // 添加高光效果
        visualizerCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        visualizerCtx.fillRect(x, height / 2 - barHeight, barWidth, 2);
        visualizerCtx.fillRect(x, height / 2 + barHeight - 2, barWidth, 2);
    }
}

function drawWaveform(width, height) {
    // 获取波形数据
    analyser.getByteTimeDomainData(dataArray);
    
    // 绘制波浪线
    visualizerCtx.beginPath();
    visualizerCtx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
    visualizerCtx.lineWidth = 2;
    visualizerCtx.lineCap = 'round';
    visualizerCtx.lineJoin = 'round';
    
    const sliceWidth = width / dataArray.length;
    let x = 0;
    
    for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height / 2) + (height / 4);
        
        if (i === 0) {
            visualizerCtx.moveTo(x, y);
        } else {
            visualizerCtx.lineTo(x, y);
        }
        
        x += sliceWidth;
    }
    
    visualizerCtx.stroke();
}