// TopLogic Shared JavaScript Functionality
// Avhenger av config.js som må lastes først

class TopLogicApp {
    constructor(options = {}) {
        this.config = window.TopLogicConfig;
        this.options = {
            enableDragDrop: true,
            enableStatusCheck: true,
            enableNavigation: true,
            ...options
        };
        this.init();
    }

    init() {
        this.initStatusCheck();
        this.initNavigation();
        this.logDebugInfo();
    }

    // Status sjekk for file:// protocol
    initStatusCheck() {
        if (!this.options.enableStatusCheck) return;
        
        const statusCheck = this.config.STATUS_CHECK.checkFileProtocol();
        if (statusCheck.hasWarning) {
            this.showStatusWarning(statusCheck.message);
        }
    }

    showStatusWarning(message) {
        const existingWarning = document.getElementById('statusCheck');
        if (existingWarning) {
            existingWarning.style.display = 'block';
            const messageElement = document.getElementById('statusMessage');
            if (messageElement) {
                messageElement.textContent = message;
            }
        } else {
            // Lag ny advarsel hvis den ikke finnes
            const warning = document.createElement('div');
            warning.id = 'statusCheck';
            warning.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; text-align: center; font-size: 14px;';
            warning.innerHTML = `<strong>Advarsel:</strong> <span>${message}</span>`;
            
            const container = document.querySelector('.toplogic-container');
            if (container) {
                container.insertBefore(warning, container.firstChild);
            }
        }
    }

    // Initialiser navigasjon og breadcrumbs
    initNavigation() {
        if (!this.options.enableNavigation) return;
        
        this.createNavigationBar();
        this.createBackLink();
    }

    createNavigationBar() {
        // Sjekk om navigation allerede eksisterer
        if (document.querySelector('.toplogic-navigation')) return;

        const nav = document.createElement('nav');
        nav.className = 'toplogic-navigation';
        
        const navContent = document.createElement('div');
        navContent.className = 'nav-content';
        
        // Logo
        const logoLink = document.createElement('a');
        logoLink.href = '/';
        logoLink.innerHTML = `<img src="${this.config.LOGOS.toplogic}" alt="TopLogic" class="nav-logo">`;
        
        // Breadcrumb
        const breadcrumb = this.createBreadcrumb();
        
        navContent.appendChild(logoLink);
        navContent.appendChild(breadcrumb);
        nav.appendChild(navContent);
        
        document.body.insertBefore(nav, document.body.firstChild);
    }

    createBreadcrumb() {
        const breadcrumb = document.createElement('div');
        breadcrumb.className = 'breadcrumb';
        
        const currentPath = window.location.pathname;
        const segments = currentPath.split('/').filter(segment => segment);
        
        // Hjem lenke
        const homeLink = document.createElement('a');
        homeLink.href = '/';
        homeLink.textContent = this.config.NAVIGATION.home.title;
        breadcrumb.appendChild(homeLink);
        
        // Hvis vi ikke er på hjemmesiden
        if (segments.length > 0) {
            const separator = document.createElement('span');
            separator.className = 'breadcrumb-separator';
            separator.textContent = ' / ';
            breadcrumb.appendChild(separator);
            
            // Finn gjeldende app
            const currentApp = this.getCurrentApp(currentPath);
            if (currentApp) {
                const appSpan = document.createElement('span');
                appSpan.textContent = currentApp.title;
                breadcrumb.appendChild(appSpan);
            }
        }
        
        return breadcrumb;
    }

    getCurrentApp(path) {
        const apps = this.config.NAVIGATION.apps;
        for (const [key, app] of Object.entries(apps)) {
            if (path.includes(app.url.replace('/', ''))) {
                return app;
            }
        }
        return null;
    }

    createBackLink() {
        // Sjekk om vi ikke er på hovedsiden
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            return;
        }

        const backLink = document.createElement('a');
        backLink.href = '/';
        backLink.className = 'back-link';
        backLink.textContent = 'Tilbake til hovedside';
        
        const container = document.querySelector('.toplogic-content');
        if (container) {
            container.insertBefore(backLink, container.firstChild);
        }
    }

    // Debug-informasjon
    logDebugInfo() {
        const debug = this.config.CONFIG_HELPERS.getDebugInfo();
        console.log('TopLogic App Debug Info:', debug);
    }

    // Generisk fil-opplasting funksjonalitet
    setupFileUpload(fileInputId, options = {}) {
        const defaults = {
            allowedTypes: 'pdf',
            enableDragDrop: true,
            enableMultiple: false,
            onFileSelect: null,
            onFilesSelect: null,
            fileListContainerId: null,
            onValidationError: null
        };
        
        const settings = { ...defaults, ...options };
        const fileInput = document.getElementById(fileInputId);
        const dropZone = fileInput?.closest('.file-upload-area');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        
        if (!fileInput) {
            console.error(`File input with id '${fileInputId}' not found`);
            return;
        }

        // Aktiver flerfilsvalg dersom konfigurert
        try {
            if (settings.enableMultiple) {
                fileInput.setAttribute('multiple', 'multiple');
            }
        } catch (_) {
            // Ignorer dersom browser ikke støtter
        }

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files, settings, fileInfo, fileName);
        });

        // Drag and drop hvis aktivert
        if (settings.enableDragDrop && dropZone) {
            this.setupDragAndDrop(dropZone, fileInput, settings, fileInfo, fileName);
        }
    }

    setupDragAndDrop(dropZone, fileInput, settings, fileInfo, fileName) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            fileInput.files = files;
            this.handleFileSelection(files, settings, fileInfo, fileName);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    handleFileSelection(files, settings, fileInfo, fileName) {
        if (!files || files.length === 0) return;

        // Håndter flerfilsvalg
        if (settings.enableMultiple) {
            const validatedFiles = [];

            for (const f of files) {
                if (!this.config.CONFIG_HELPERS.isValidFileType(f, settings.allowedTypes)) {
                    const error = this.config.APP_CONFIG.messages.error.invalidFileType;
                    if (settings.onValidationError) settings.onValidationError(error);
                    return;
                }
                if (!this.config.CONFIG_HELPERS.isValidFileSize(f)) {
                    const error = this.config.APP_CONFIG.messages.error.fileTooBig;
                    if (settings.onValidationError) settings.onValidationError(error);
                    return;
                }
                validatedFiles.push(f);
            }

            // Oppdater UI for liste eller oppsummering
            if (fileInfo) fileInfo.classList.add('show');
            if (fileName) fileName.textContent = `${validatedFiles.length} fil${validatedFiles.length === 1 ? '' : 'er'} valgt`;

            // Render i egen container dersom oppgitt
            if (settings.fileListContainerId) {
                const container = document.getElementById(settings.fileListContainerId);
                if (container) {
                    container.innerHTML = '';
                    validatedFiles.forEach((vf, index) => {
                        const row = document.createElement('div');
                        row.className = 'file-row';
                        row.dataset.fileIndex = String(index);
                        row.innerHTML = `
                            <div class="file-row-name">${vf.name}</div>
                            <div class="file-row-meta">${TopLogicUtils.formatFileSize(vf.size)}</div>
                        `;
                        container.appendChild(row);
                    });
                    container.classList.add('show');
                }
            }

            if (settings.onFilesSelect) settings.onFilesSelect(validatedFiles);
            return;
        }

        // Enkeltfil som før
        const file = files[0];

        if (!this.config.CONFIG_HELPERS.isValidFileType(file, settings.allowedTypes)) {
            const error = this.config.APP_CONFIG.messages.error.invalidFileType;
            if (settings.onValidationError) settings.onValidationError(error);
            return;
        }
        if (!this.config.CONFIG_HELPERS.isValidFileSize(file)) {
            const error = this.config.APP_CONFIG.messages.error.fileTooBig;
            if (settings.onValidationError) settings.onValidationError(error);
            return;
        }

        if (fileName) fileName.textContent = file.name;
        if (fileInfo) fileInfo.classList.add('show');

        if (settings.onFileSelect) settings.onFileSelect(file);
    }

    // Kø-basert sending av flere dokumenter med forsinkelse
    async submitFormsQueue(formDataArray, webhookType, options = {}) {
        const defaults = {
            onQueueStart: null,
            onItemStart: null,
            onItemProgress: null,
            onItemSuccess: null,
            onItemError: null,
            onQueueProgress: null,
            onQueueComplete: null,
            delay: this.config.APP_CONFIG.queue?.delayBetweenSends || 3000,
            showCountdown: this.config.APP_CONFIG.queue?.showCountdown || true
        };
        
        const settings = { ...defaults, ...options };
        const total = formDataArray.length;
        let completed = 0;
        let successful = 0;
        let failed = 0;

        // Generer batch ID for hele køen
        const batchId = this.generateBatchId();
        console.log('Batch ID:', batchId);
        this.showBatchId(batchId);

        // Start køen
        if (settings.onQueueStart) {
            const delayInSeconds = Math.round(settings.delay / 1000);
            const message = this.config.APP_CONFIG.messages.success.queueStarted
                .replace('{count}', total)
                .replace('{delay}', delayInSeconds);
            settings.onQueueStart(message);
        }

        this.setLoadingState(true);

        for (let i = 0; i < formDataArray.length; i++) {
            const formData = formDataArray[i];
            const isFirst = i === 0;
            
            // Vis progress for køen
            if (settings.onQueueProgress) {
                const message = this.config.APP_CONFIG.messages.success.queueProgress
                    .replace('{current}', i + 1)
                    .replace('{total}', total);
                settings.onQueueProgress(message, i + 1, total);
            }

            // Vent før sending (bortsett fra første)
            if (!isFirst && settings.delay > 0) {
                await this.delayWithCountdown(settings.delay, settings.showCountdown, i + 1, total);
            }

            // Send dokumentet
            try {
                await this.submitForm(formData, webhookType, {
                    batchId: batchId,
                    onStart: () => {
                        if (settings.onItemStart) settings.onItemStart(i, formData);
                    },
                    onProgress: (progress) => {
                        if (settings.onItemProgress) settings.onItemProgress(i, progress);
                    },
                    onSuccess: (message) => {
                        successful++;
                        if (settings.onItemSuccess) settings.onItemSuccess(i, message);
                    },
                    onError: (error) => {
                        failed++;
                        if (settings.onItemError) settings.onItemError(i, error);
                    }
                });
            } catch (error) {
                failed++;
                if (settings.onItemError) settings.onItemError(i, error.message);
            }

            completed++;
        }

        this.setLoadingState(false);

        // Ferdig med køen
        if (settings.onQueueComplete) {
            const message = this.config.APP_CONFIG.messages.success.queueCompleted
                .replace('{count}', successful);
            settings.onQueueComplete(message, successful, failed, total);
        }

        return { successful, failed, total };
    }

    // Hjelpemetode for forsinkelse med nedtelling
    async delayWithCountdown(delayMs, showCountdown = true, current, total) {
        const delaySeconds = Math.ceil(delayMs / 1000);
        
        if (showCountdown) {
            for (let sec = delaySeconds; sec > 0; sec--) {
                const message = `Venter ${sec} sekunder før sending av dokument ${current} av ${total}...`;
                this.showMessage(message, 'info', 1100);
                await this.delay(1000);
            }
        } else {
            await this.delay(delayMs);
        }
    }

    // Enkel delay-hjelpemetode
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Generisk form submission
    async submitForm(formData, webhookType, options = {}) {
        const defaults = {
            onStart: null,
            onProgress: null,
            onSuccess: null,
            onError: null,
            onComplete: null,
            progressInterval: 200,
            batchId: null
        };
        
        const settings = { ...defaults, ...options };
        const webhookUrl = this.config.CONFIG_HELPERS.getWebhookUrl(webhookType);
        
        if (!webhookUrl) {
            const error = `Webhook URL ikke funnet for type: ${webhookType}`;
            if (settings.onError) settings.onError(error);
            return;
        }

        // Legg til batchId hvis oppgitt
        if (settings.batchId) {
            formData.append('batchId', settings.batchId);
            console.log('Batch ID:', settings.batchId);
            console.log('Payload med batchId:', Object.fromEntries(formData.entries()));
        }

        // Start loading
        if (settings.onStart) settings.onStart();

        // Simuler progress hvis aktivert
        let progressInterval;
        if (settings.onProgress) {
            let progress = 0;
            progressInterval = setInterval(() => {
                progress += 10;
                settings.onProgress(Math.min(progress, 90));
            }, settings.progressInterval);
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                body: formData
            });

            if (progressInterval) {
                clearInterval(progressInterval);
                if (settings.onProgress) settings.onProgress(100);
            }

            if (!response.ok) {
                throw new Error(this.config.APP_CONFIG.messages.error.serverError.replace('{status}', response.status));
            }

            // Success
            const successMessage = webhookType === 'test' 
                ? this.config.APP_CONFIG.messages.success.testMode
                : this.config.APP_CONFIG.messages.success.documentUploaded;
            
            if (settings.onSuccess) settings.onSuccess(successMessage);

        } catch (error) {
            if (progressInterval) clearInterval(progressInterval);
            const errorMessage = this.config.APP_CONFIG.messages.error.networkError.replace('{message}', error.message);
            if (settings.onError) settings.onError(errorMessage);
        } finally {
            if (settings.onComplete) settings.onComplete();
        }
    }

    // Vis meldinger
    showMessage(text, type = 'info', duration = 5000) {
        const messageElement = document.getElementById('message');
        if (!messageElement) return;

        messageElement.textContent = text;
        messageElement.className = `message ${type} show`;

        if (type === 'success' && duration > 0) {
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, duration);
        }
    }

    // Progress bar kontroll
    setProgress(percentage, show = true) {
        const progressBar = document.getElementById('progressBar');
        const progressFill = document.getElementById('progressFill');
        
        if (progressBar && show) {
            progressBar.classList.add('show');
        }
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
        }
        
        if (percentage >= 100 && progressBar) {
            setTimeout(() => {
                progressBar.classList.remove('show');
                if (progressFill) progressFill.style.width = '0%';
            }, 1000);
        }
    }

    // Loading state kontroll
    setLoadingState(isLoading, buttonId = 'submitBtn') {
        const button = document.getElementById(buttonId);
        const spinner = document.getElementById('loadingSpinner');
        
        if (button) {
            button.disabled = isLoading;
        }
        
        if (spinner) {
            spinner.style.display = isLoading ? 'block' : 'none';
        }
    }

    // Nullstill form
    resetForm(formId, options = {}) {
        const form = document.getElementById(formId);
        if (!form) return;

        form.reset();
        
        // Skjul file info
        const fileInfo = document.getElementById('fileInfo');
        if (fileInfo) fileInfo.classList.remove('show');
        
        // Skjul meldinger
        const message = document.getElementById('message');
        if (message) message.classList.remove('show');
        
        // Fjern batch ID display
        const batchIdDisplay = document.querySelector('.batch-id-display');
        if (batchIdDisplay) {
            batchIdDisplay.remove();
        }
        
        // Reset progress
        this.setProgress(0, false);
        
        // Tilleggs-reset logikk
        if (options.onReset) options.onReset();
    }

    // Generer batch ID for gruppert sending av filer
    generateBatchId() {
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
            (now.getMonth() + 1).toString().padStart(2, '0') +
            now.getDate().toString().padStart(2, '0') +
            now.getHours().toString().padStart(2, '0') +
            now.getMinutes().toString().padStart(2, '0') +
            now.getSeconds().toString().padStart(2, '0');
        
        const randomPart = Math.random().toString(36).substr(2, 6).toUpperCase();
        
        return `${timestamp}_${randomPart}`;
    }

    // Vis batch ID i UI
    showBatchId(batchId) {
        // Finn eller opprett batch ID display element
        let batchIdDisplay = document.querySelector('.batch-id-display');
        if (!batchIdDisplay) {
            batchIdDisplay = document.createElement('div');
            batchIdDisplay.className = 'batch-id-display';
            batchIdDisplay.style.cssText = 'font-size: 12px; color: #666; font-family: monospace; margin-top: 8px; text-align: center;';
            
            // Plasser elementet under progress bar
            const progressBar = document.getElementById('progressBar');
            if (progressBar && progressBar.parentNode) {
                progressBar.parentNode.insertBefore(batchIdDisplay, progressBar.nextSibling);
            }
        }
        
        batchIdDisplay.textContent = `Batch ID: ${batchId}`;
        batchIdDisplay.style.display = 'block';
    }

    // Auto-detect dokumenttype basert på filnavn
    autoSelectDocumentType(filename, selectId) {
        const select = document.getElementById(selectId);
        if (!select) return;
        
        const lowerFilename = filename.toLowerCase();
        
        if (lowerFilename.includes('test')) {
            select.value = 'test';
        } else if (lowerFilename.includes('bring') && lowerFilename.includes('transport')) {
            select.value = 'bring_transport';
        }
    }
}

// Password-protected app access
class AppPasswordManager {
    static enablePasswordProtection(linkId, password, redirectUrl, promptText) {
        const link = document.getElementById(linkId);
        if (!link) return;

        link.addEventListener('click', function(e) {
            e.preventDefault();
            const userPassword = prompt(promptText);
            if (userPassword === password) {
                link.style.opacity = '1';
                link.style.cursor = 'pointer';
                link.classList.remove('btn-locked');
                window.location.href = redirectUrl;
            } else if (userPassword !== null) {
                alert('Feil passord');
            }
        });
    }
}

// Utility functions
const TopLogicUtils = {
    // Format file size
    formatFileSize: (bytes) => {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },
    
    // Format timestamp
    formatDate: (isoString) => {
        return new Date(isoString).toLocaleString('no-NO');
    },
    
    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Export til global scope
window.TopLogicApp = TopLogicApp;
window.AppPasswordManager = AppPasswordManager;
window.TopLogicUtils = TopLogicUtils; 