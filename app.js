// ==================== 全局变量定义 ====================

// 漫画相关数据
let comics = [];                          // 所有漫画列表
let currentComic = null;                  // 当前正在阅读的漫画
let currentChapter = null;                // 当前正在阅读的章节
let currentImageIndex = 0;                // 当前显示的图片索引
let currentImages = [];                   // 当前章节的所有图片
let currentComicIndex = 0;                // 当前漫画在列表中的索引
let currentChapterIndex = 0;              // 当前章节在漫画中的索引

// 音频相关数据
let currentAlbum = null;                  // 当前正在播放的专辑
let currentTrackIndex = 0;                // 当前播放的曲目索引
let currentTracks = [];                   // 当前专辑的所有曲目
let currentAlbumIndex = 0;                // 当前专辑在列表中的索引
let albums = [];                          // 所有专辑列表

// 应用状态
let currentMode = 'comic';                // 当前模式：'comic'（漫画）或 'audio'（音频）
let audio = null;                         // Audio 对象实例
let isPlaying = false;                    // 音频播放状态

// ==================== DOM 元素获取 ====================

// 界面元素
const selectFolderBtn = document.getElementById('selectFolder');      // 选择文件夹按钮
const fileTreeEl = document.getElementById('fileTree');              // 文件树容器
const viewerEl = document.getElementById('viewer');                  // 查看器容器
const noContentEl = document.getElementById('noContent');            // 无内容提示
const viewerImageEl = document.getElementById('viewerImage');        // 图片显示元素
const viewerInfoEl = document.getElementById('viewerInfo');          // 图片信息显示
const navHintEl = document.getElementById('navHint');                // 导航提示

// 音频播放器元素
const audioPlayerEl = document.getElementById('audioPlayer');        // 音频播放器容器
const audioTitleEl = document.getElementById('audioTitle');          // 曲目标题
const audioAlbumEl = document.getElementById('audioAlbum');          // 专辑名称
const audioPlayPauseBtn = document.getElementById('audioPlayPause');  // 播放/暂停按钮
const audioPrevBtn = document.getElementById('audioPrev');            // 上一首按钮
const audioNextBtn = document.getElementById('audioNext');            // 下一首按钮
const progressBarEl = document.getElementById('progressBar');        // 进度条容器
const progressFillEl = document.getElementById('progressFill');      // 进度条填充
const progressHandleEl = document.getElementById('progressHandle');  // 进度条滑块
const currentTimeEl = document.getElementById('currentTime');        // 当前时间显示
const totalTimeEl = document.getElementById('totalTime');            // 总时间显示
const audioVolumeEl = document.getElementById('audioVolume');        // 音量滑块
const coverImageEl = document.getElementById('coverImage');          // 专辑封面图片
const audioIconEl = document.getElementById('audioIcon');            // 默认音频图标

// ==================== 事件监听器 ====================

// 选择文件夹按钮点击事件
selectFolderBtn.addEventListener('click', async () => {
    try {
        // 调用浏览器 API 打开文件夹选择器
        const dirHandle = await window.showDirectoryPicker();
        // 显示加载提示
        fileTreeEl.innerHTML = '<div class="no-content" style="padding: 20px;">加载中...</div>';
        // 加载媒体文件
        await loadMedia(dirHandle);
    } catch (err) {
        // 错误处理：显示友好的错误信息
        console.error('Error selecting folder:', err);
        fileTreeEl.innerHTML = `<div class="no-content" style="padding: 20px;">
            错误：${err.message}<br><br>
            请确保使用 Chrome 或 Edge 浏览器，并且授予了文件夹访问权限。
        </div>`;
    }
});

// ==================== 核心功能函数 ====================

/**
 * 加载媒体文件（漫画和音频）
 * @param {FileSystemDirectoryHandle} dirHandle - 根目录句柄
 */
async function loadMedia(dirHandle) {
    // 清空现有数据
    comics = [];
    albums = [];

    // 第一步：递归扫描所有音频目录
    // 先扫描音频，因为音频目录中的图片应该作为封面，而不是漫画
    const audioDirs = await findAudioDirsRecursive(dirHandle, '');
    // 收集所有音频目录的路径，用于后续排除
    const audioDirPaths = new Set(audioDirs.map(a => a.path));

    // 第二步：递归扫描图片目录，排除音频目录
    const imageLeafDirs = await findImageDirsRecursive(dirHandle, audioDirPaths, '');

    // 第三步：将图片目录按漫画分组
    const comicMap = new Map();
    for (const leaf of imageLeafDirs) {
        const chapter = {
            name: leaf.chapterName,      // 章节名称
            handle: leaf.handle,          // 章节目录句柄
            images: leaf.images           // 章节中的图片列表
        };

        // 使用漫画名作为唯一键，确保同一漫画的章节被正确分组
        const comicKey = leaf.comicName + '|' + (leaf.comicHandle ? leaf.comicHandle.name : '');
        if (!comicMap.has(comicKey)) {
            comicMap.set(comicKey, {
                name: leaf.comicName,     // 漫画名称
                handle: leaf.comicHandle, // 漫画目录句柄
                chapters: []              // 章节列表
            });
        }
        // 将章节添加到对应的漫画中
        comicMap.get(comicKey).chapters.push(chapter);
    }

    // 第四步：对漫画和章节进行排序
    for (const comic of comicMap.values()) {
        // 章节按名称排序（支持数字排序，如"第2话"排在"第10话"前）
        comic.chapters.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
        comics.push(comic);
    }
    // 漫画按名称排序
    comics.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // 第五步：处理专辑数据
    for (const album of audioDirs) {
        albums.push({
            name: album.albumName,        // 专辑名称
            handle: album.handle,          // 专辑目录句柄
            tracks: album.tracks,          // 曲目列表
            cover: album.cover             // 专辑封面
        });
    }
    // 专辑按名称排序
    albums.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    // 第六步：渲染文件树
    renderFileTree();
}

/**
 * 递归查找包含图片的目录
 * @param {FileSystemDirectoryHandle} rootHandle - 根目录句柄
 * @param {Set<string>} audioDirPaths - 音频目录路径集合（需要排除）
 * @param {string} parentPath - 父目录路径
 * @returns {Promise<Array>} 包含图片的目录信息数组
 */
async function findImageDirsRecursive(rootHandle, audioDirPaths = new Set(), parentPath = '') {
    // 支持的图片格式
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const results = [];

    /**
     * 递归扫描目录
     * @param {FileSystemDirectoryHandle} dirHandle - 当前目录句柄
     * @param {FileSystemDirectoryHandle|null} parentHandle - 父目录句柄
     * @param {string} currentPath - 当前目录路径
     */
    async function scan(dirHandle, parentHandle, currentPath) {
        // 构建当前目录的完整路径
        const dirPath = currentPath ? currentPath + '/' + dirHandle.name : dirHandle.name;
        
        // 如果当前目录是音频目录，跳过扫描
        // 这样可以避免将专辑封面识别为漫画
        if (audioDirPaths.has(dirPath)) {
            return;
        }

        let imagesInThisDir = [];  // 当前目录中的图片
        const subdirs = [];        // 子目录列表

        // 遍历目录中的所有条目
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                // 处理文件：检查是否为图片
                const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
                if (imageExtensions.includes(ext)) {
                    imagesInThisDir.push({
                        name: entry.name,   // 文件名
                        handle: entry       // 文件句柄
                    });
                }
            } else if (entry.kind === 'directory') {
                // 处理目录：添加到子目录列表
                subdirs.push(entry);
            }
        }

        // 如果当前目录包含图片，将其识别为一个章节
        if (imagesInThisDir.length > 0) {
            // 按文件名排序（支持数字排序）
            imagesInThisDir.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

            // 确定漫画和章节的名称
            const comicHandle = parentHandle || dirHandle;
            const comicName = parentHandle ? parentHandle.name : dirHandle.name;
            const chapterName = parentHandle ? dirHandle.name : '图片';

            // 将结果添加到数组
            results.push({
                comicName,       // 漫画名称
                comicHandle,     // 漫画目录句柄
                chapterName,     // 章节名称
                handle: dirHandle, // 章节目录句柄
                images: imagesInThisDir // 图片列表
            });
        }

        // 递归扫描子目录
        for (const subdir of subdirs) {
            await scan(subdir, dirHandle, dirPath);
        }
    }

    // 开始扫描
    await scan(rootHandle, null, parentPath);
    return results;
}

/**
 * 递归查找包含音频的目录（专辑）
 * @param {FileSystemDirectoryHandle} rootHandle - 根目录句柄
 * @param {string} parentPath - 父目录路径
 * @returns {Promise<Array>} 包含音频的目录信息数组
 */
async function findAudioDirsRecursive(rootHandle, parentPath = '') {
    // 支持的音频格式
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.wma'];
    // 支持的图片格式（用于专辑封面）
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const results = [];

    /**
     * 递归扫描目录
     * @param {FileSystemDirectoryHandle} dirHandle - 当前目录句柄
     * @param {string} currentPath - 当前目录路径
     */
    async function scan(dirHandle, currentPath) {
        // 构建当前目录的完整路径
        const dirPath = currentPath ? currentPath + '/' + dirHandle.name : dirHandle.name;
        
        let tracksInThisDir = [];  // 当前目录中的音频文件
        let cover = null;          // 专辑封面
        const subdirs = [];        // 子目录列表

        // 遍历目录中的所有条目
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                const ext = entry.name.toLowerCase().substring(entry.name.lastIndexOf('.'));
                if (audioExtensions.includes(ext)) {
                    // 处理音频文件：添加到曲目列表
                    tracksInThisDir.push({
                        name: entry.name.replace(/\.[^.]+$/, ''),  // 去除扩展名的文件名
                        fullName: entry.name,                        // 完整文件名
                        handle: entry                               // 文件句柄
                    });
                } else if (imageExtensions.includes(ext) && !cover) {
                    // 处理图片文件：第一张图片作为专辑封面
                    cover = {
                        name: entry.name,
                        handle: entry
                    };
                }
            } else if (entry.kind === 'directory') {
                // 处理目录：添加到子目录列表
                subdirs.push(entry);
            }
        }

        // 如果当前目录包含音频，将其识别为一个专辑
        if (tracksInThisDir.length > 0) {
            // 按曲目名排序（支持数字排序）
            tracksInThisDir.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
            results.push({
                albumName: dirHandle.name,  // 专辑名称（目录名）
                handle: dirHandle,          // 专辑目录句柄
                tracks: tracksInThisDir,    // 曲目列表
                cover: cover,               // 专辑封面
                path: dirPath              // 专辑路径（用于排除）
            });
        }

        // 递归扫描子目录
        for (const subdir of subdirs) {
            await scan(subdir, dirPath);
        }
    }

    // 开始扫描
    await scan(rootHandle, parentPath);
    return results;
}

/**
 * 渲染文件树（左侧导航栏）
 */
function renderFileTree() {
    let html = '';

    // 渲染漫画部分
    if (comics.length > 0) {
        html += '<div class="section-header">📖 漫画</div>';
        html += comics.map((comic, comicIndex) => `
            <div class="comic-folder" data-comic-index="${comicIndex}">
                <div class="comic-title">${comic.name}</div>
                <div class="chapters">
                    ${comic.chapters.map((chapter, chapterIndex) => `
                        <div class="chapter" data-comic-index="${comicIndex}" data-chapter-index="${chapterIndex}">
                            ${chapter.name}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // 渲染音乐专辑部分
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

    // 如果没有找到任何内容，显示提示
    if (comics.length === 0 && albums.length === 0) {
        html = '<div class="no-content" style="padding: 20px;">未找到漫画或音频文件夹</div>';
    }

    // 将 HTML 插入到文件树容器
    fileTreeEl.innerHTML = html;

    // 为漫画/专辑标题添加点击事件（展开/收起）
    document.querySelectorAll('.comic-title').forEach(title => {
        title.addEventListener('click', (e) => {
            const folder = e.target.closest('.comic-folder');
            folder.classList.toggle('open');
        });
    });

    // 为章节/曲目添加点击事件
    document.querySelectorAll('.chapter').forEach(chapter => {
        chapter.addEventListener('click', (e) => {
            const comicIndex = e.target.dataset.comicIndex;
            const albumIndex = e.target.dataset.albumIndex;
            
            // 根据数据属性判断是漫画还是音频
            if (comicIndex !== undefined) {
                const chapterIndex = parseInt(e.target.dataset.chapterIndex);
                openChapter(parseInt(comicIndex), chapterIndex);
            } else if (albumIndex !== undefined) {
                const trackIndex = parseInt(e.target.dataset.trackIndex);
                openAlbum(parseInt(albumIndex), trackIndex);
            }
        });
    });
}

// ==================== 漫画阅读功能 ====================

/**
 * 打开指定章节
 * @param {number} comicIndex - 漫画索引
 * @param {number} chapterIndex - 章节索引
 */
async function openChapter(comicIndex, chapterIndex) {
    // 停止音频播放
    stopAudio();
    
    // 切换到漫画模式
    currentMode = 'comic';
    currentComicIndex = comicIndex;
    currentChapterIndex = chapterIndex;
    currentComic = comics[comicIndex];
    currentChapter = currentComic.chapters[chapterIndex];
    currentImageIndex = 0;
    currentImages = currentChapter.images;

    // 更新文件树中的选中状态
    document.querySelectorAll('.chapter').forEach(el => el.classList.remove('active'));
    const chapterEl = document.querySelector(`.chapter[data-comic-index="${comicIndex}"][data-chapter-index="${chapterIndex}"]`);
    if (chapterEl) {
        chapterEl.classList.add('active');
        const comicFolder = chapterEl.closest('.comic-folder');
        if (comicFolder) comicFolder.classList.add('open');
    }

    // 隐藏音频播放器
    audioPlayerEl.style.display = 'none';
    // 显示第一张图片
    await showImage();
}

/**
 * 显示当前图片
 */
async function showImage() {
    if (currentImages.length === 0) return;

    // 获取当前图片
    const image = currentImages[currentImageIndex];
    // 从文件句柄获取文件
    const file = await image.handle.getFile();
    // 创建 Blob URL
    const url = URL.createObjectURL(file);

    // 设置图片源并显示
    viewerImageEl.src = url;
    viewerImageEl.style.display = 'block';
    noContentEl.style.display = 'none';
    navHintEl.style.display = 'block';
    viewerInfoEl.style.display = 'block';
    // 显示图片信息：漫画名 - 章节名 - 当前页/总页数
    viewerInfoEl.textContent = `${currentComic.name} - ${currentChapter.name} - ${currentImageIndex + 1}/${currentImages.length}`;
}

/**
 * 下一页
 * 支持跨章节和跨漫画翻页
 */
async function nextPage() {
    if (!currentComic || !currentChapter || currentImages.length === 0) return;
    
    // 如果当前章节还有下一页
    if (currentImageIndex < currentImages.length - 1) {
        currentImageIndex++;
        await showImage();
    } else {
        // 当前章节已读完，尝试打开下一章
        if (currentChapterIndex < currentComic.chapters.length - 1) {
            await openChapter(currentComicIndex, currentChapterIndex + 1);
        } else if (currentComicIndex < comics.length - 1) {
            // 当前漫画已读完，尝试打开下一部漫画
            await openChapter(currentComicIndex + 1, 0);
        }
    }
}

/**
 * 上一页
 * 支持跨章节和跨漫画翻页
 */
async function prevPage() {
    if (!currentComic || !currentChapter || currentImages.length === 0) return;
    
    // 如果当前章节还有上一页
    if (currentImageIndex > 0) {
        currentImageIndex--;
        await showImage();
    } else {
        // 当前章节已读完，尝试打开上一章
        if (currentChapterIndex > 0) {
            await openChapter(currentComicIndex, currentChapterIndex - 1);
            // 跳转到上一章的最后一页
            currentImageIndex = currentComic.chapters[currentChapterIndex].images.length - 1;
            await showImage();
        } else if (currentComicIndex > 0) {
            // 当前漫画已读完，尝试打开上一部漫画
            const newComicIndex = currentComicIndex - 1;
            const newChapterIndex = comics[newComicIndex].chapters.length - 1;
            await openChapter(newComicIndex, newChapterIndex);
            // 跳转到上一部漫画最后一章的最后一页
            currentImageIndex = comics[newComicIndex].chapters[newChapterIndex].images.length - 1;
            await showImage();
        }
    }
}

// ==================== 音频播放功能 ====================

/**
 * 打开指定专辑
 * @param {number} albumIndex - 专辑索引
 * @param {number} trackIndex - 曲目索引
 */
async function openAlbum(albumIndex, trackIndex) {
    // 停止当前音频播放
    stopAudio();
    
    // 切换到音频模式
    currentMode = 'audio';
    currentAlbumIndex = albumIndex;
    currentTrackIndex = trackIndex;
    currentAlbum = albums[albumIndex];
    currentTracks = currentAlbum.tracks;

    // 更新文件树中的选中状态
    document.querySelectorAll('.chapter').forEach(el => el.classList.remove('active'));
    const trackEl = document.querySelector(`.chapter[data-album-index="${albumIndex}"][data-track-index="${trackIndex}"]`);
    if (trackEl) {
        trackEl.classList.add('active');
        const albumFolder = trackEl.closest('.comic-folder');
        if (albumFolder) albumFolder.classList.add('open');
    }

    // 隐藏漫画相关元素
    viewerImageEl.style.display = 'none';
    viewerInfoEl.style.display = 'none';
    navHintEl.style.display = 'none';
    noContentEl.style.display = 'none';
    // 显示音频播放器
    audioPlayerEl.style.display = 'flex';

    // 显示专辑封面（如果有）
    if (currentAlbum.cover) {
        const file = await currentAlbum.cover.handle.getFile();
        const url = URL.createObjectURL(file);
        coverImageEl.src = url;
        coverImageEl.style.display = 'block';
        audioIconEl.style.display = 'none';
    } else {
        // 没有封面则显示默认图标
        coverImageEl.style.display = 'none';
        audioIconEl.style.display = 'block';
    }

    // 加载并播放指定曲目
    await loadAndPlayTrack(currentTrackIndex);
}

/**
 * 加载并播放指定曲目
 * @param {number} trackIndex - 曲目索引
 */
async function loadAndPlayTrack(trackIndex) {
    // 边界检查
    if (trackIndex < 0 || trackIndex >= currentTracks.length) return;
    
    // 更新当前曲目索引
    currentTrackIndex = trackIndex;
    const track = currentTracks[trackIndex];
    
    // 更新播放器界面信息
    audioTitleEl.textContent = track.name;
    audioAlbumEl.textContent = currentAlbum.name;
    
    // 清理旧的音频对象
    if (audio) {
        audio.pause();
        audio = null;
    }

    // 从文件句柄获取文件并创建 Blob URL
    const file = await track.handle.getFile();
    const url = URL.createObjectURL(file);
    
    // 创建新的 Audio 对象
    audio = new Audio(url);
    audio.volume = audioVolumeEl.value / 100;
    
    // 音频元数据加载完成时更新总时长
    audio.addEventListener('loadedmetadata', () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });
    
    // 音频播放时更新进度条
    audio.addEventListener('timeupdate', updateProgress);
    
    // 音频播放结束时自动播放下一首
    audio.addEventListener('ended', () => {
        nextTrack();
    });
    
    // 音频播放错误处理
    audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        alert(`无法播放 "${track.name}"\n\n原因：浏览器不支持此音频格式。\n\n请使用 MP3、M4A、OGG、WAV 或 FLAC 格式的音频文件。`);
        audio = null;
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
    });
    
    // 尝试播放音频
    try {
        await audio.play();
        isPlaying = true;
        audioPlayPauseBtn.textContent = '⏸';
    } catch (err) {
        console.error('Playback failed:', err);
        alert(`播放失败: ${err.message}\n\n可能的原因：\n- 浏览器不支持此音频格式\n- 需要用户交互才能播放`);
        audio = null;
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
    }
    
    // 更新文件树中的选中状态
    document.querySelectorAll('.chapter').forEach(el => el.classList.remove('active'));
    const trackEl = document.querySelector(`.chapter[data-album-index="${currentAlbumIndex}"][data-track-index="${currentTrackIndex}"]`);
    if (trackEl) trackEl.classList.add('active');
}

/**
 * 播放音频
 */
function playAudio() {
    if (audio && !isPlaying) {
        audio.play();
        isPlaying = true;
        audioPlayPauseBtn.textContent = '⏸';
    }
}

/**
 * 暂停音频
 */
function pauseAudio() {
    if (audio && isPlaying) {
        audio.pause();
        isPlaying = false;
        audioPlayPauseBtn.textContent = '▶';
    }
}

/**
 * 停止音频播放
 */
function stopAudio() {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio = null;
    }
    isPlaying = false;
    audioPlayPauseBtn.textContent = '▶';
}

/**
 * 下一首
 * 支持跨专辑播放
 */
function nextTrack() {
    // 如果当前专辑还有下一首
    if (currentTrackIndex < currentTracks.length - 1) {
        loadAndPlayTrack(currentTrackIndex + 1);
    } else if (currentAlbumIndex < albums.length - 1) {
        // 当前专辑已播放完，尝试播放下一部专辑
        openAlbum(currentAlbumIndex + 1, 0);
    }
}

/**
 * 上一首
 * 支持跨专辑播放
 */
function prevTrack() {
    // 如果当前专辑还有上一首
    if (currentTrackIndex > 0) {
        loadAndPlayTrack(currentTrackIndex - 1);
    } else if (currentAlbumIndex > 0) {
        // 当前专辑已播放完，尝试播放上一部专辑的最后一首
        const prevAlbum = albums[currentAlbumIndex - 1];
        openAlbum(currentAlbumIndex - 1, prevAlbum.tracks.length - 1);
    }
}

/**
 * 更新进度条
 */
function updateProgress() {
    if (!audio) return;
    
    // 计算播放进度百分比
    const progress = (audio.currentTime / audio.duration) * 100;
    progressFillEl.style.width = `${progress}%`;
    progressHandleEl.style.left = `${progress}%`;
    // 更新当前时间显示
    currentTimeEl.textContent = formatTime(audio.currentTime);
}

/**
 * 格式化时间（秒 -> 分:秒）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 跳转到指定位置
 * @param {MouseEvent} e - 鼠标事件
 */
function seekTo(e) {
    if (!audio) return;
    
    // 计算点击位置在进度条中的百分比
    const rect = progressBarEl.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
}

// ==================== 播放器控制事件 ====================

// 播放/暂停按钮点击事件
audioPlayPauseBtn.addEventListener('click', () => {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
});

// 上一首按钮点击事件
audioPrevBtn.addEventListener('click', () => {
    if (currentMode === 'audio') {
        prevTrack();
    }
});

// 下一首按钮点击事件
audioNextBtn.addEventListener('click', () => {
    if (currentMode === 'audio') {
        nextTrack();
    }
});

// 进度条点击事件（跳转）
progressBarEl.addEventListener('click', seekTo);

// 音量滑块输入事件
audioVolumeEl.addEventListener('input', () => {
    if (audio) {
        audio.volume = audioVolumeEl.value / 100;
    }
});

// ==================== 键盘快捷键 ====================

/**
 * 全局键盘事件监听
 * 漫画模式：左右键翻页
 * 音频模式：左右键切歌，空格键播放/暂停
 */
document.addEventListener('keydown', (e) => {
    if (currentMode === 'audio') {
        // 音频模式快捷键
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
    } else {
        // 漫画模式快捷键
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
            e.preventDefault();
            nextPage();
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            e.preventDefault();
            prevPage();
        }
    }
});

// ==================== 鼠标交互 ====================

/**
 * 查看器点击事件
 * 在漫画模式下，点击图片或空白区域翻到下一页
 */
viewerEl.addEventListener('click', (e) => {
    if (currentMode === 'comic' && (e.target === viewerImageEl || e.target === viewerEl)) {
        nextPage();
    }
});