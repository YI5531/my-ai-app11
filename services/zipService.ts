

import JSZip from 'jszip';
import { Project } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * UTILITIES
 */

const getMimeType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'html': case 'htm': return 'text/html';
        case 'js': case 'mjs': return 'text/javascript';
        case 'jsx': case 'ts': case 'tsx': return 'text/javascript'; // Transpiled to JS
        case 'css': return 'text/css';
        case 'json': return 'application/json';
        case 'png': return 'image/png';
        case 'jpg': case 'jpeg': return 'image/jpeg';
        case 'svg': return 'image/svg+xml';
        case 'gif': return 'image/gif';
        case 'webp': return 'image/webp';
        default: return 'application/octet-stream';
    }
};

const normalizePath = (path: string): string => {
    // Replace backslashes
    let res = path.replace(/\\/g, '/');
    // Remove leading ./ or /
    res = res.replace(/^(\.\/|\/)+/, '');
    return res;
};

const getDirname = (path: string): string => {
    const parts = normalizePath(path).split('/');
    return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
};

// Robust relative path resolver
const resolvePath = (baseDir: string, relativePath: string): string => {
    if (relativePath.startsWith('/')) return normalizePath(relativePath);
    if (relativePath.match(/^(http|https|data:|blob:|mailto:|javascript:)/)) return relativePath;

    const baseParts = baseDir ? baseDir.split('/').filter(p => p && p !== '.') : [];
    const targetParts = relativePath.split('?')[0].split('#')[0].split('/');
    
    const stack = [...baseParts];

    for (const part of targetParts) {
        if (!part || part === '.') continue;
        if (part === '..') {
            if (stack.length > 0) stack.pop();
        } else {
            stack.push(part);
        }
    }

    return stack.join('/');
};

/**
 * CORE LOGIC
 */

const normalizeFileMap = (rawFiles: Record<string, Blob>): { files: Record<string, Blob>, entryPoint: string } => {
    const rawKeys = Object.keys(rawFiles);
    
    // 1. Initial Clean: Remove __MACOSX, .DS_Store, and other junk
    let validKeys = rawKeys.filter(k => 
        !k.includes('__MACOSX') && 
        !k.endsWith('.DS_Store') && 
        !k.includes('desktop.ini') &&
        !k.includes('Thumbs.db')
    );
    
    // Fallback if everything was filtered
    if (validKeys.length === 0 && rawKeys.length > 0) {
        validKeys = rawKeys;
    }

    // 2. Smart Un-nesting
    const splitKeys = validKeys.map(k => k.split('/'));
    let commonPrefix = '';
    
    if (splitKeys.length > 0) {
        const potentialRoot = splitKeys[0][0] + '/'; 
        if (splitKeys[0].length > 1 && validKeys.every(k => k.startsWith(potentialRoot))) {
            commonPrefix = potentialRoot;
        }
    }

    // 3. Build Final Map
    const files: Record<string, Blob> = {};
    validKeys.forEach(k => {
        const newKey = commonPrefix ? k.substring(commonPrefix.length) : k;
        if (newKey) {
            files[newKey] = rawFiles[k];
        }
    });

    // 4. Find Entry Point
    let entryPoint = '';
    const fileList = Object.keys(files);
    
    if (files['index.html']) {
        entryPoint = 'index.html';
    } else if (files['index.htm']) {
        entryPoint = 'index.htm';
    } else {
        const htmlFiles = fileList.filter(f => f.match(/\.html?$/i));
        htmlFiles.sort((a, b) => {
            const depthA = a.split('/').length;
            const depthB = b.split('/').length;
            return depthA - depthB || a.localeCompare(b);
        });
        
        if (htmlFiles.length > 0) {
            entryPoint = htmlFiles[0];
        }
    }

    return { files, entryPoint };
};

// Rewrite imports to use absolute "app/..." paths instead of "./..."
// This fixes the "Invalid relative url" error in srcdoc iframes
const rewriteImports = (code: string, currentPath: string) => {
    const dir = getDirname(currentPath);
    
    // Regex matches: import ... from "..." OR export ... from "..."
    // Group 2 is the path specifier
    return code.replace(/((?:import|export)\s+(?:[\w\s{},*]*\s+from\s+)?['"])([^'"]+)(['"])/g, (match, prefix, path, suffix) => {
        // Only rewrite relative paths starting with .
        if (path.startsWith('.')) {
            let resolved = resolvePath(dir, path);
            // Prefix with "app/" to match our Import Map keys
            return `${prefix}app/${resolved}${suffix}`;
        }
        return match;
    });
};

const processCss = async (content: string, currentPath: string, assetMap: Record<string, string>): Promise<string> => {
    const dir = getDirname(currentPath);
    // Replace url(...) with blob urls
    return content.replace(/url\((['"]?)(.*?)\1\)/gi, (match, quote, url) => {
        const clean = url.trim().replace(/['"]/g, '');
        if (clean.match(/^(data:|http|https|blob:)/)) return match;
        
        const resolved = resolvePath(dir, clean);
        if (assetMap[resolved]) {
            return `url('${assetMap[resolved]}')`;
        }
        return match;
    });
};

/**
 * EXPORTED FUNCTIONS
 */

export async function processZipFile(file: File): Promise<Project> {
    const zip = new JSZip();
    const rawFiles: Record<string, Blob> = {};
    
    try {
        const loadedZip = await zip.loadAsync(file);
        
        const entries = Object.keys(loadedZip.files);
        for (const name of entries) {
            const entry = loadedZip.files[name];
            if (!entry.dir && !name.endsWith('/')) {
                const blob = await entry.async('blob');
                rawFiles[normalizePath(name)] = blob;
            }
        }

        if (Object.keys(rawFiles).length === 0) {
             throw new Error("Empty ZIP file");
        }

        const { files, entryPoint } = normalizeFileMap(rawFiles);

        return {
            id: uuidv4(),
            name: file.name.replace(/\.zip$/i, ''),
            description: 'Imported via ZIP',
            createdAt: Date.now(),
            type: entryPoint ? 'web' : 'code_snippet',
            files,
            entryPoint,
            settings: { injectConsole: true }
        };
    } catch (e) {
        console.error("ZIP processing failed", e);
        throw new Error("Invalid ZIP file");
    }
}

export async function processFolder(fileList: FileList): Promise<Project> {
    const rawFiles: Record<string, Blob> = {};
    let rootName = 'Imported Folder';
    
    if (fileList.length > 0) {
        // Try to get root name from relative path if available
        const firstPath = fileList[0].webkitRelativePath;
        if (firstPath) {
             const parts = firstPath.split('/');
             if (parts.length > 1) rootName = parts[0];
        }
    }

    Array.from(fileList).forEach(file => {
        // On Mobile/APK, webkitRelativePath might be missing.
        // Fallback to name (flat structure) if path is missing.
        const path = normalizePath(file.webkitRelativePath || file.name);
        rawFiles[path] = file;
    });

    const { files, entryPoint } = normalizeFileMap(rawFiles);

    return {
        id: uuidv4(),
        name: rootName,
        description: 'Imported Folder',
        createdAt: Date.now(),
        type: entryPoint ? 'web' : 'code_snippet',
        files,
        entryPoint,
        settings: { injectConsole: true }
    };
}

export async function processSingleFile(file: File): Promise<Project> {
    const files: Record<string, Blob> = {};
    files[file.name] = file;
    
    return {
        id: uuidv4(),
        name: file.name,
        description: 'Single File',
        createdAt: Date.now(),
        type: 'web',
        files,
        entryPoint: file.name,
        settings: { injectConsole: true }
    };
}

export async function prepareHtmlForExecution(project: Project, globalApiKey?: string): Promise<string> {
    if (!project.entryPoint || !project.files[project.entryPoint]) {
        return generateDebugPage(project);
    }

    const assetMap: Record<string, string> = {};
    const fileKeys = Object.keys(project.files);
    
    // 1. Pre-process and Transpile JS/TS/React
    for (const key of fileKeys) {
        const isCode = key.match(/\.(tsx|ts|jsx|js)$/);
        const isCss = key.endsWith('.css');
        const isEntry = key === project.entryPoint;

        if (isCode && !isEntry) {
            let content = await project.files[key].text();
            
            // Remove CSS imports
            content = content.replace(/import\s+['"].*\.css['"];?/g, '');

            // Rewrite relative imports to absolute "app/..." keys
            content = rewriteImports(content, key);

            // Transpile using Babel if available
            if ((window as any).Babel && key.match(/\.(tsx|ts|jsx)$/)) {
                try {
                    const result = (window as any).Babel.transform(content, {
                        presets: ['react', 'typescript'],
                        filename: key,
                        // Ensure Babel doesn't try to resolve imports, we handled it
                        plugins: [] 
                    });
                    content = result.code;
                } catch (e) {
                    console.error("Transpilation failed for", key, e);
                }
            }
            
            const blob = new Blob([content], { type: 'text/javascript' });
            assetMap[key] = URL.createObjectURL(blob);
        } else if (!isCode && !isCss && !isEntry) {
            assetMap[key] = URL.createObjectURL(project.files[key]);
        }
    }

    // 2. Process CSS
    let globalCss = 'html, body, #root { height: 100%; margin: 0; } ';
    for (const key of fileKeys) {
        if (key.endsWith('.css')) {
            const text = await project.files[key].text();
            const processed = await processCss(text, key, assetMap);
            globalCss += `\n/* ${key} */\n${processed}`;
        }
    }

    // 3. Prepare Import Map
    const imports: Record<string, string> = {};
    const addedKeys = Object.keys(assetMap);

    addedKeys.forEach(key => {
        const url = assetMap[key];
        
        // 1. Exact match: app/src/App.tsx -> blob
        imports[`app/${key}`] = url;
        
        // 2. Extension-less match: app/src/App -> blob
        const noExt = key.replace(/\.[^/.]+$/, "");
        if (noExt !== key) {
            imports[`app/${noExt}`] = url;
        }

        // 3. Directory Index match: app/src/utils -> blob (if key is src/utils/index.tsx)
        if (key.endsWith('/index.tsx') || key.endsWith('/index.ts') || key.endsWith('/index.js') || key.endsWith('/index.jsx')) {
            const dir = key.substring(0, key.lastIndexOf('/index.'));
            imports[`app/${dir}`] = url;
        }
    });

    // Add common CDN fallbacks
    if (!imports['react']) imports['react'] = 'https://esm.sh/react@18.2.0';
    if (!imports['react-dom']) imports['react-dom'] = 'https://esm.sh/react-dom@18.2.0/client';
    if (!imports['react-dom/client']) imports['react-dom/client'] = 'https://esm.sh/react-dom@18.2.0/client';
    if (!imports['lucide-react']) imports['lucide-react'] = 'https://esm.sh/lucide-react@0.263.1';

    // 4. Process HTML
    let html = await project.files[project.entryPoint].text();
    const entryDir = getDirname(project.entryPoint);
    
    // Ensure API Key is a valid string, not undefined
    const apiKey = project.settings?.apiKey || globalApiKey || '';

    // Injections
    const headInjections = `
        <meta charset="UTF-8">
        <script>
            // CRITICAL: Synchronous Environment Injection
            // This ensures process.env is ready BEFORE any module scripts run
            (function() {
                const k = "${apiKey}";
                window.API_KEY = k;
                window.process = window.process || {};
                window.process.env = window.process.env || {};
                window.process.env.API_KEY = k;
                
                if(!k) {
                    console.warn("[Nexus] No API Key found in environment. API calls (400) may fail.");
                } else {
                    console.log("[Nexus] Environment initialized securely.");
                }

                // Suppress Tailwind CDN Warning
                const _warn = console.warn;
                console.warn = function(...args) {
                    if (args[0] && typeof args[0] === 'string' && args[0].includes('cdn.tailwindcss.com')) return;
                    _warn.apply(console, args);
                };
            })();

            // Console Proxy
            const _log = (type, args) => {
                try {
                    window.parent.postMessage({
                        type: 'NEXUS_LOG',
                        payload: { 
                            type, 
                            message: Array.from(args).map(a => {
                                try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } 
                                catch(e) { return String(a); }
                            }).join(' '), 
                            timestamp: Date.now() 
                        }
                    }, '*');
                } catch(e) {}
            };
            ['log','warn','error','info','debug'].forEach(m => {
                const o = console[m];
                console[m] = (...a) => { _log(m, a); if(o) o.apply(console, a); };
            });
            window.onerror = (msg, url, line) => _log('error', [msg + ' (Line ' + line + ')']);
        </script>
        <script type="importmap">
            { "imports": ${JSON.stringify(imports)} }
        </script>
        <style>${globalCss}</style>
        <script src="https://cdn.tailwindcss.com"></script>
    `;

    if (html.includes('<head>')) {
        html = html.replace('<head>', `<head>${headInjections}`);
    } else {
        html = `<head>${headInjections}</head>${html}`;
    }

    // 5. Rewrite HTML Attributes
    const attrs = ['src', 'href', 'action'];
    const regex = new RegExp(`(${attrs.join('|')})=["']?([^"'>\\s]+)["']?`, 'gi');
    
    html = html.replace(regex, (match, attr, val) => {
        if (val.match(/^(http|https|data:|blob:|#|mailto:)/)) return match;
        
        const resolved = resolvePath(entryDir, val);
        if (assetMap[resolved]) return `${attr}="${assetMap[resolved]}"`;

        const alternatives = [
            resolved.replace('.js', '.tsx'),
            resolved.replace('.js', '.jsx'),
            resolved.replace('.js', '.ts')
        ];
        
        for (const alt of alternatives) {
            if (assetMap[alt]) {
                return `${attr}="${assetMap[alt]}"`;
            }
        }

        return match;
    });

    return html;
}

function generateDebugPage(project: Project): string {
    return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Debug</title>
            <style>
                body{background:#0f172a;color:#fff;font-family:sans-serif;padding:20px;}
                .card{background:#1e293b;padding:20px;border-radius:8px;}
                ul{list-style:none;padding:0;}
                li{padding:8px;border-bottom:1px solid #334155;}
            </style>
        </head>
        <body>
            <div class="card">
                <h2>No Entry Point Found</h2>
                <p>Could not locate index.html. Loaded files:</p>
                <ul>
                    ${Object.keys(project.files).map(f => `<li>${f}</li>`).join('')}
                </ul>
            </div>
        </body>
        </html>`;
}
