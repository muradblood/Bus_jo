<?php
/**
 * SAT Bus Booking - Project Installer
 * For PHP Shared Hosting Deployment
 */

session_start();

// Configuration
$projectName = 'SAT Bus Booking';
$projectVersion = '2.0.0';
$minPhpVersion = '8.3.0';  // Requires PHP 8.3+
$requiredExtensions = ['zip', 'json', 'filter'];
$optionalExtensions = ['curl', 'mbstring', 'openssl'];

// Get base URL
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$scriptPath = dirname($_SERVER['SCRIPT_NAME']);
$baseUrl = $protocol . '://' . $host . ($scriptPath === '/' ? '' : $scriptPath);
$rootPath = dirname(__FILE__);

// Actions
$action = isset($_GET['action']) ? $_GET['action'] : '';
$step = isset($_GET['step']) ? (int)$_GET['step'] : 1;

// Helper functions
function getPhpVersionStatus($min) {
    $current = PHP_VERSION;
    $ok = version_compare($current, $min, '>=');
    return ['current' => $current, 'ok' => $ok, 'min' => $min];
}

function checkExtension($name) {
    $loaded = extension_loaded($name);
    $class = $loaded ? 'success' : 'danger';
    $icon = $loaded ? '&#10003;' : '&#10007;';
    return ['name' => $name, 'loaded' => $loaded, 'class' => $class, 'icon' => $icon];
}

function checkWritePermission($path) {
    $writable = is_writable($path);
    $class = $writable ? 'success' : 'danger';
    $icon = $writable ? '&#10003;' : '&#10007;';
    return ['path' => $path, 'writable' => $writable, 'class' => $class, 'icon' => $icon];
}

function isInstalled() {
    $rootPath = dirname(__FILE__);
    return file_exists($rootPath . '/index.html') && 
           file_exists($rootPath . '/assets') &&
           !file_exists($rootPath . '/install.php.lock');
}

// Handle AJAX actions
if ($action === 'api') {
    header('Content-Type: application/json');
    
    $apiAction = isset($_POST['api_action']) ? $_POST['api_action'] : '';
    
    switch ($apiAction) {
        case 'check_requirements':
            $php = getPhpVersionStatus($minPhpVersion);
            $reqExts = array_map('checkExtension', $requiredExtensions);
            $optExts = array_map('checkExtension', $optionalExtensions);
            $reqAllOk = $php['ok'] && !in_array(false, array_column($reqExts, 'loaded'));
            
            echo json_encode([
                'php' => $php,
                'required_extensions' => $reqExts,
                'optional_extensions' => $optExts,
                'all_ok' => $reqAllOk
            ]);
            exit;
            
        case 'check_permissions':
            $paths = [$rootPath, $rootPath . '/assets'];
            $results = array_map(function($p) {
                $exists = file_exists($p);
                $writable = is_writable($p);
                return [
                    'path' => $p,
                    'exists' => $exists,
                    'writable' => $writable,
                    'ok' => $exists && $writable,
                    'class' => ($exists && $writable) ? 'success' : ($exists ? 'warning' : 'danger'),
                    'icon' => ($exists && $writable) ? '&#10003;' : ($exists ? '!' : '&#10007;')
                ];
            }, $paths);
            
            echo json_encode([
                'checks' => $results,
                'all_ok' => !in_array(false, array_column($results, 'ok'))
            ]);
            exit;
            
        case 'install':
            $errors = [];
            $success = [];
            
            // Check if already installed
            if (file_exists($rootPath . '/install.php.lock')) {
                unlink($rootPath . '/install.php.lock');
            }
            
            // Check for project archive
            $archiveFile = $rootPath . '/project.zip';
            if (file_exists($archiveFile)) {
                $zip = new ZipArchive();
                if ($zip->open($archiveFile) === TRUE) {
                    $zip->extractTo($rootPath);
                    $zip->close();
                    $success[] = 'Project files extracted successfully';
                    @unlink($archiveFile);
                } else {
                    $errors[] = 'Failed to extract project.zip';
                }
            }
            
            // Verify core files exist
            $coreFiles = ['index.html', 'assets', 'sat-logo.png'];
            foreach ($coreFiles as $file) {
                if (!file_exists($rootPath . '/' . $file)) {
                    $errors[] = 'Missing core file: ' . $file;
                }
            }
            
            if (empty($errors)) {
                $success[] = 'All core files verified';
                
                // Create .htaccess if not exists
                $htaccessFile = $rootPath . '/.htaccess';
                if (!file_exists($htaccessFile)) {
                    $htaccessContent = "# SAT Bus Booking - Rewrite Rules\n";
                    $htaccessContent .= "<IfModule mod_rewrite.c>\n";
                    $htaccessContent .= "    RewriteEngine On\n";
                    $htaccessContent .= "    RewriteBase " . $scriptPath . "/\n";
                    $htaccessContent .= "    \n";
                    $htaccessContent .= "    # Allow direct access to existing files and directories\n";
                    $htaccessContent .= "    RewriteCond %{REQUEST_FILENAME} !-f\n";
                    $htaccessContent .= "    RewriteCond %{REQUEST_FILENAME} !-d\n";
                    $htaccessContent .= "    \n";
                    $htaccessContent .= "    # Redirect everything to index.html for SPA routing\n";
                    $htaccessContent .= "    RewriteRule ^(.*)$ index.html [L]\n";
                    $htaccessContent .= "</IfModule>\n";
                    $htaccessContent .= "\n";
                    $htaccessContent .= "# Security Headers\n";
                    $htaccessContent .= "<IfModule mod_headers.c>\n";
                    $htaccessContent .= "    Header set X-Content-Type-Options nosniff\n";
                    $htaccessContent .= "    Header set X-Frame-Options DENY\n";
                    $htaccessContent .= "    Header set X-XSS-Protection 1; mode=block\n";
                    $htaccessContent .= "    Header set Referrer-Policy strict-origin-when-cross-origin\n";
                    $htaccessContent .= "</IfModule>\n";
                    $htaccessContent .= "\n";
                    $htaccessContent .= "# Enable Gzip Compression\n";
                    $htaccessContent .= "<IfModule mod_deflate.c>\n";
                    $htaccessContent .= "    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json\n";
                    $htaccessContent .= "</IfModule>\n";
                    $htaccessContent .= "\n";
                    $htaccessContent .= "# Cache static assets\n";
                    $htaccessContent .= "<IfModule mod_expires.c>\n";
                    $htaccessContent .= "    ExpiresActive On\n";
                    $htaccessContent .= "    ExpiresByType image/jpeg A2592000\n";
                    $htaccessContent .= "    ExpiresByType image/png A2592000\n";
                    $htaccessContent .= "    ExpiresByType text/css A604800\n";
                    $htaccessContent .= "    ExpiresByType application/javascript A604800\n";
                    $htaccessContent .= "</IfModule>\n";
                    
                    if (file_put_contents($htaccessFile, $htaccessContent)) {
                        $success[] = '.htaccess created with rewrite rules and security headers';
                    } else {
                        $errors[] = 'Failed to create .htaccess file';
                    }
                } else {
                    $success[] = '.htaccess already exists';
                }
                
                // Create lock file to mark installation complete
                file_put_contents($rootPath . '/install.php.lock', date('Y-m-d H:i:s'));
                $success[] = 'Installation completed on ' . date('Y-m-d H:i:s');
                
                echo json_encode([
                    'success' => true,
                    'messages' => $success,
                    'errors' => $errors,
                    'redirect_url' => $baseUrl . '/index.html'
                ]);
            } else {
                echo json_encode([
                    'success' => false,
                    'messages' => $success,
                    'errors' => $errors
                ]);
            }
            exit;
            
        case 'cleanup':
            $removed = [];
            $failed = [];
            
            // Remove install files
            $filesToRemove = [
                'install.php',
                'install.php.lock',
                'project.zip'
            ];
            
            foreach ($filesToRemove as $file) {
                $filepath = $rootPath . '/' . $file;
                if (file_exists($filepath)) {
                    if (@unlink($filepath)) {
                        $removed[] = $file;
                    } else {
                        $failed[] = $file;
                    }
                }
            }
            
            echo json_encode([
                'success' => count($failed) === 0,
                'removed' => $removed,
                'failed' => $failed
            ]);
            exit;
            
        case 'set_password':
            $currentPassword = isset($_POST['current_password']) ? $_POST['current_password'] : '';
            $newPassword = isset($_POST['new_password']) ? $_POST['new_password'] : '';
            
            $passwordFile = $rootPath . '/.admin_password';
            
            // Check if password file exists
            if (file_exists($passwordFile)) {
                // Verify current password
                $storedHash = file_get_contents($passwordFile);
                $currentHash = hash('sha256', $currentPassword . 'sat_salt_2024');
                if ($currentHash !== trim($storedHash)) {
                    echo json_encode(['success' => false, 'message' => 'كلمة المرور الحالية غير صحيحة']);
                    exit;
                }
            }
            
            // Validate new password
            if (empty($newPassword) || strlen($newPassword) < 4) {
                echo json_encode(['success' => false, 'message' => 'كلمة المرور الجديدة يجب أن تكون 4 أحرف على الأقل']);
                exit;
            }
            
            // Save new password hash
            $newHash = hash('sha256', $newPassword . 'sat_salt_2024');
            if (file_put_contents($passwordFile, $newHash)) {
                echo json_encode(['success' => true, 'message' => 'تم تغيير كلمة المرور بنجاح']);
            } else {
                echo json_encode(['success' => false, 'message' => 'فشل حفظ كلمة المرور']);
            }
            exit;
            
        case 'get_password_status':
            $passwordFile = $rootPath . '/.admin_password';
            echo json_encode([
                'has_password' => file_exists($passwordFile),
                'message' => file_exists($passwordFile) ? 'تم تعيين كلمة مرور' : 'استخدام كلمة المرور الافتراضية (sat123)'
            ]);
            exit;
            
        case 'verify_password':
            $password = isset($_POST['password']) ? $_POST['password'] : '';
            $passwordFile = $rootPath . '/.admin_password';
            
            if (!file_exists($passwordFile)) {
                // Default password check
                $valid = ($password === 'sat123');
            } else {
                $storedHash = file_get_contents($passwordFile);
                $inputHash = hash('sha256', $password . 'sat_salt_2024');
                $valid = ($inputHash === trim($storedHash));
            }
            
            echo json_encode(['valid' => $valid]);
            exit;
            
        default:
            echo json_encode(['error' => 'Unknown API action']);
            exit;
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تثبيت <?php echo $projectName; ?> - معالج التثبيت</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a2a6c 0%, #2d5a87 50%, #3d8b7e 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .installer-container {
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 25px 80px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 700px;
            overflow: hidden;
        }
        
        .installer-header {
            background: linear-gradient(135deg, #1a56db 0%, #0e2e6e 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
        }
        
        .installer-header::after {
            content: '';
            position: absolute;
            bottom: -30px;
            left: 0;
            right: 0;
            height: 60px;
            background: white;
            clip-path: ellipse(60% 100% at 50% 0%);
        }
        
        .logo-icon {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        
        .logo-icon svg {
            width: 50px;
            height: 50px;
        }
        
        .installer-header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 700;
        }
        
        .installer-header p {
            opacity: 0.85;
            font-size: 14px;
        }
        
        .version-badge {
            display: inline-block;
            background: rgba(255,255,255,0.2);
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 12px;
            margin-top: 10px;
        }
        
        .installer-body {
            padding: 50px 40px 30px;
        }
        
        .step-indicator {
            display: flex;
            justify-content: center;
            margin-bottom: 40px;
            gap: 0;
        }
        
        .step-dot {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            background: #e5e7eb;
            color: #6b7280;
            position: relative;
            z-index: 2;
            transition: all 0.3s;
        }
        
        .step-dot.active {
            background: #1a56db;
            color: white;
            box-shadow: 0 4px 15px rgba(26, 86, 219, 0.4);
        }
        
        .step-dot.completed {
            background: #10b981;
            color: white;
        }
        
        .step-line {
            width: 60px;
            height: 3px;
            background: #e5e7eb;
            margin-top: 18px;
            transition: all 0.3s;
        }
        
        .step-line.completed {
            background: #10b981;
        }
        
        .step-content {
            display: none;
        }
        
        .step-content.active {
            display: block;
            animation: fadeIn 0.5s ease;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .step-title {
            font-size: 22px;
            color: #1f2937;
            margin-bottom: 8px;
            text-align: center;
        }
        
        .step-desc {
            color: #6b7280;
            text-align: center;
            margin-bottom: 30px;
            font-size: 14px;
        }
        
        .check-list {
            list-style: none;
            margin-bottom: 30px;
        }
        
        .check-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            transition: all 0.3s;
        }
        
        .check-item:hover {
            border-color: #d1d5db;
            transform: translateX(-3px);
        }
        
        .check-item.success {
            border-color: #10b981;
            background: #ecfdf5;
        }
        
        .check-item.warning {
            border-color: #f59e0b;
            background: #fffbeb;
        }
        
        .check-item.danger {
            border-color: #ef4444;
            background: #fef2f2;
        }
        
        .check-label {
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            color: #374151;
        }
        
        .check-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
        }
        
        .check-icon.success {
            background: #10b981;
            color: white;
        }
        
        .check-icon.warning {
            background: #f59e0b;
            color: white;
        }
        
        .check-icon.danger {
            background: #ef4444;
            color: white;
        }
        
        .check-value {
            font-size: 13px;
            color: #6b7280;
            font-family: monospace;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 14px 32px;
            border-radius: 12px;
            font-size: 15px;
            font-weight: 600;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            font-family: inherit;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #1a56db 0%, #0e2e6e 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(26, 86, 219, 0.3);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(26, 86, 219, 0.4);
        }
        
        .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .btn-success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }
        
        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
        }
        
        .btn-danger {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
            box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
        }
        
        .btn-group {
            display: flex;
            gap: 12px;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 30px;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #1a56db, #10b981);
            border-radius: 4px;
            transition: width 0.5s ease;
            width: 0%;
        }
        
        .progress-fill.animating {
            width: 100%;
        }
        
        .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .message-box {
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 20px;
            font-size: 14px;
            display: none;
        }
        
        .message-box.show {
            display: block;
            animation: fadeIn 0.3s ease;
        }
        
        .message-box.success {
            background: #ecfdf5;
            border: 1px solid #10b981;
            color: #065f46;
        }
        
        .message-box.error {
            background: #fef2f2;
            border: 1px solid #ef4444;
            color: #991b1b;
        }
        
        .message-box.info {
            background: #eff6ff;
            border: 1px solid #1a56db;
            color: #1e40af;
        }
        
        .success-screen {
            text-align: center;
            padding: 20px 0;
        }
        
        .success-icon {
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 30px;
            box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
            animation: scaleIn 0.5s ease;
        }
        
        @keyframes scaleIn {
            from { transform: scale(0); }
            to { transform: scale(1); }
        }
        
        .success-icon svg {
            width: 50px;
            height: 50px;
            stroke: white;
        }
        
        .info-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
            text-align: right;
        }
        
        .info-card h4 {
            color: #1f2937;
            margin-bottom: 12px;
            font-size: 15px;
        }
        
        .info-card ul {
            list-style: none;
            padding: 0;
        }
        
        .info-card li {
            padding: 6px 0;
            color: #4b5563;
            font-size: 13px;
        }
        
        .info-card li::before {
            content: '&#10003;';
            color: #10b981;
            margin-left: 8px;
            font-weight: bold;
        }
        
        .log-output {
            background: #1f2937;
            color: #e5e7eb;
            padding: 20px;
            border-radius: 12px;
            font-family: monospace;
            font-size: 12px;
            max-height: 200px;
            overflow-y: auto;
            text-align: left;
            direction: ltr;
            margin-top: 20px;
        }
        
        .log-line {
            padding: 2px 0;
            border-bottom: 1px solid #374151;
        }
        
        .log-line:last-child {
            border-bottom: none;
        }
        
        .log-success { color: #34d399; }
        .log-error { color: #f87171; }
        .log-info { color: #60a5fa; }
        
        .footer {
            text-align: center;
            padding: 20px 40px 30px;
            color: #9ca3af;
            font-size: 12px;
        }
        
        @media (max-width: 600px) {
            .installer-header {
                padding: 30px 20px;
            }
            .installer-body {
                padding: 40px 20px 20px;
            }
            .step-dot {
                width: 35px;
                height: 35px;
                font-size: 12px;
            }
            .step-line {
                width: 30px;
            }
        }
    </style>
</head>
<body>
    <div class="installer-container">
        <!-- Header -->
        <div class="installer-header">
            <div class="logo-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1a56db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="6" width="18" height="12" rx="2"/>
                    <path d="M6 18v2M18 18v2M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <circle cx="7.5" cy="14.5" r="1.5" fill="#1a56db" stroke="none"/>
                    <circle cx="16.5" cy="14.5" r="1.5" fill="#1a56db" stroke="none"/>
                </svg>
            </div>
            <h1><?php echo $projectName; ?></h1>
            <p>معالج تثبيت المشروع على الاستضافة</p>
            <span class="version-badge">v<?php echo $projectVersion; ?></span>
        </div>
        
        <!-- Body -->
        <div class="installer-body">
            <!-- Step Indicator -->
            <div class="step-indicator">
                <div class="step-dot active" id="dot-1">1</div>
                <div class="step-line" id="line-1"></div>
                <div class="step-dot" id="dot-2">2</div>
                <div class="step-line" id="line-2"></div>
                <div class="step-dot" id="dot-3">3</div>
                <div class="step-line" id="line-3"></div>
                <div class="step-dot" id="dot-4">4</div>
            </div>
            
            <!-- Step 1: Requirements -->
            <div class="step-content active" id="step-1">
                <h2 class="step-title">&#9881; فحص المتطلبات</h2>
                <p class="step-desc">جاري التحقق من متطلبات النظام...</p>
                
                <div class="message-box" id="msg-step1"></div>
                
                <ul class="check-list" id="req-list">
                    <li class="check-item" id="php-check">
                        <span class="check-label">
                            <span class="check-icon" id="php-icon">&#8987;</span>
                            <span>إصدار PHP</span>
                        </span>
                        <span class="check-value" id="php-value">جاري الفحص...</span>
                    </li>
                </ul>
                
                <div id="ext-container" style="display:none;">
                    <h4 style="margin: 20px 0 15px; color: #4b5563; font-size: 14px;">الإضافات المطلوبة:</h4>
                    <ul class="check-list" id="ext-list"></ul>
                </div>
                
                <div class="btn-group">
                    <button class="btn btn-primary" id="btn-check" onclick="checkRequirements()">
                        <span id="btn-check-text">بدء الفحص</span>
                    </button>
                    <button class="btn btn-success" id="btn-next-1" onclick="goToStep(2)" style="display:none;">
                        التالي &#8592;
                    </button>
                </div>
            </div>
            
            <!-- Step 2: Permissions -->
            <div class="step-content" id="step-2">
                <h2 class="step-title">&#128451; التحقق من الصلاحيات</h2>
                <p class="step-desc">التأكد من صلاحيات الكتابة على المجلدات</p>
                
                <div class="message-box" id="msg-step2"></div>
                
                <ul class="check-list" id="perm-list"></ul>
                
                <div class="btn-group">
                    <button class="btn btn-primary" id="btn-perm" onclick="checkPermissions()">
                        <span id="btn-perm-text">فحص الصلاحيات</span>
                    </button>
                    <button class="btn btn-success" id="btn-next-2" onclick="goToStep(3)" style="display:none;">
                        التالي &#8592;
                    </button>
                    <button class="btn btn-danger" onclick="goToStep(1)">&#8594; السابق</button>
                </div>
            </div>
            
            <!-- Step 3: Install -->
            <div class="step-content" id="step-3">
                <h2 class="step-title">&#128230; تثبيت المشروع</h2>
                <p class="step-desc">نشر ملفات المشروع وإعداد الإعدادات</p>
                
                <div class="message-box" id="msg-step3"></div>
                
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-bar"></div>
                </div>
                
                <div class="info-card" id="install-summary">
                    <h4>&#128161; ملخص التثبيت:</h4>
                    <ul>
                        <li>فحص ملفات المشروع</li>
                        <li>إنشاء ملف .htaccess بقواعد Rewrite</li>
                        <li>تفعيل ضغط Gzip</li>
                        <li>إضافة Headers أمنية</li>
                        <li>تفعيل التخزين المؤقت للصور</li>
                    </ul>
                </div>
                
                <div class="log-output" id="install-log" style="display:none;"></div>
                
                <div class="btn-group">
                    <button class="btn btn-primary" id="btn-install" onclick="startInstall()">
                        <span id="btn-install-text">&#128230; بدء التثبيت</span>
                    </button>
                    <button class="btn btn-success" id="btn-next-3" onclick="goToStep(4)" style="display:none;">
                        التالي &#8592;
                    </button>
                    <button class="btn btn-danger" onclick="goToStep(2)">&#8594; السابق</button>
                </div>
            </div>
            
            <!-- Step 4: Complete -->
            <div class="step-content" id="step-4">
                <div class="success-screen">
                    <div class="success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h2 class="step-title">&#127881; تم التثبيت بنجاح!</h2>
                    <p class="step-desc">تم تثبيت المشروع بنجاح على استضافتك</p>
                    
                    <div class="info-card" style="text-align: center;">
                        <h4>&#128279; روابط المشروع:</h4>
                        <ul style="text-align: center;">
                            <li style="text-align: center;">
                                <a href="<?php echo $baseUrl; ?>/index.html" style="color: #1a56db; text-decoration: none; font-weight: 600;">
                                    &#127968; الصفحة الرئيسية
                                </a>
                            </li>
                            <li style="text-align: center;">
                                <a href="<?php echo $baseUrl; ?>/index.html#/admin" style="color: #1a56db; text-decoration: none; font-weight: 600;">
                                    &#128272; لوحة التحكم
                                </a>
                            </li>
                        </ul>
                    </div>
                    
                    <div class="info-card" style="background: #fffbeb; border-color: #f59e0b;">
                        <h4 style="color: #92400e;">&#9888; بيانات دخول لوحة التحكم:</h4>
                        <ul>
                            <li>اسم المستخدم: <strong>admin</strong></li>
                            <li>كلمة المرور: <strong id="default-password-display">sat123 (افتراضية)</strong></li>
                        </ul>
                    </div>
                    
                    <!-- Password Change Section -->
                    <div class="info-card" style="background: #eff6ff; border-color: #1a56db; margin-top: 20px;">
                        <h4 style="color: #1e40af;">&#128272; تغيير كلمة المرور (اختياري):</h4>
                        <p style="font-size: 12px; color: #6b7280; margin-bottom: 15px;">يمكنك تغيير كلمة المرور الافتراضية قبل بدء استخدام الموقع</p>
                        
                        <div id="password-change-form">
                            <div style="margin-bottom: 12px;">
                                <input type="password" id="install-current-pass" placeholder="كلمة المرور الحالية (sat123)" 
                                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit;">
                            </div>
                            <div style="margin-bottom: 12px;">
                                <input type="password" id="install-new-pass" placeholder="كلمة المرور الجديدة" 
                                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit;">
                            </div>
                            <div style="margin-bottom: 12px;">
                                <input type="password" id="install-confirm-pass" placeholder="تأكيد كلمة المرور الجديدة" 
                                    style="width: 100%; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; font-family: inherit;">
                            </div>
                            <button class="btn btn-primary" onclick="changeInstallPassword()" style="width: 100%; margin-top: 5px;">
                                &#128272; تغيير كلمة المرور
                            </button>
                            <div id="password-change-result" style="margin-top: 12px; display: none;"></div>
                        </div>
                    </div>
                    
                    <div class="message-box info show" style="text-align: center;">
                        &#128161; <strong>تنبيه:</strong> يُنصح بحذف ملف install.php بعد اكتمال التثبيت لأسباب أمنية
                    </div>
                    
                    <div class="btn-group" style="margin-top: 30px;">
                        <a href="<?php echo $baseUrl; ?>/index.html" class="btn btn-success" style="text-decoration:none;">
                            &#127968; فتح الموقع
                        </a>
                        <button class="btn btn-danger" onclick="cleanupInstall()">
                            &#128163; حذف ملف التثبيت
                        </button>
                    </div>
                    
                    <div class="log-output" id="cleanup-log" style="display:none; margin-top: 20px;"></div>
                </div>
            </div>
        </div>
        
        <!-- Footer -->
        <div class="footer">
            SAT Bus Booking &copy; <?php echo date('Y'); ?> - نظام حجز الباصات
        </div>
    </div>
    
    <script>
        let currentStep = 1;
        const totalSteps = 4;
        
        function goToStep(step) {
            // Hide all steps
            document.querySelectorAll('.step-content').forEach(el => {
                el.classList.remove('active');
            });
            
            // Show target step
            document.getElementById('step-' + step).classList.add('active');
            
            // Update dots
            for (let i = 1; i <= totalSteps; i++) {
                const dot = document.getElementById('dot-' + i);
                dot.classList.remove('active', 'completed');
                if (i < step) {
                    dot.classList.add('completed');
                    dot.innerHTML = '&#10003;';
                } else if (i === step) {
                    dot.classList.add('active');
                    dot.innerHTML = i;
                } else {
                    dot.innerHTML = i;
                }
            }
            
            // Update lines
            for (let i = 1; i < totalSteps; i++) {
                const line = document.getElementById('line-' + i);
                if (i < step) {
                    line.classList.add('completed');
                } else {
                    line.classList.remove('completed');
                }
            }
            
            currentStep = step;
        }
        
        function showMessage(id, text, type) {
            const msg = document.getElementById(id);
            msg.textContent = text;
            msg.className = 'message-box ' + type + ' show';
        }
        
        function hideMessage(id) {
            document.getElementById(id).className = 'message-box';
        }
        
        function setLoading(btnId, textId, loading) {
            const btn = document.getElementById(btnId);
            const text = document.getElementById(textId);
            if (loading) {
                btn.disabled = true;
                text.innerHTML = '<span class="loading-spinner"></span> جاري المعالجة...';
            } else {
                btn.disabled = false;
            }
        }
        
        function createCheckItem(id, label, iconClass, valueText) {
            return `<li class="check-item ${iconClass}" id="${id}">
                <span class="check-label">
                    <span class="check-icon ${iconClass}">${iconClass === 'success' ? '&#10003;' : iconClass === 'warning' ? '!' : '&#10007;'}</span>
                    <span>${label}</span>
                </span>
                <span class="check-value">${valueText}</span>
            </li>`;
        }
        
        async function checkRequirements() {
            setLoading('btn-check', 'btn-check-text', true);
            hideMessage('msg-step1');
            
            try {
                const formData = new FormData();
                formData.append('api_action', 'check_requirements');
                
                const response = await fetch('?action=api', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                // Update PHP check
                const phpCheck = document.getElementById('php-check');
                const phpIcon = document.getElementById('php-icon');
                const phpValue = document.getElementById('php-value');
                
                phpValue.textContent = data.php.current + ' (مطلوب: ' + data.php.min + ')';
                if (data.php.ok) {
                    phpCheck.className = 'check-item success';
                    phpIcon.className = 'check-icon success';
                    phpIcon.innerHTML = '&#10003;';
                } else {
                    phpCheck.className = 'check-item danger';
                    phpIcon.className = 'check-icon danger';
                    phpIcon.innerHTML = '&#10007;';
                }
                
                // Show and update extensions
                document.getElementById('ext-container').style.display = 'block';
                const extList = document.getElementById('ext-list');
                extList.innerHTML = '';
                
                data.required_extensions.forEach(ext => {
                    extList.innerHTML += createCheckItem(
                        'ext-' + ext.name,
                        'إضافة ' + ext.name,
                        ext.class,
                        ext.loaded ? 'مثبتة' : 'غير مثبتة'
                    );
                });
                
                if (data.optional_extensions.length > 0) {
                    extList.innerHTML += '<li style="padding: 10px 0; color: #6b7280; font-size: 13px; border-bottom: 1px dashed #e5e7eb;">إضافات اختيارية:</li>';
                    data.optional_extensions.forEach(ext => {
                        extList.innerHTML += createCheckItem(
                            'ext-opt-' + ext.name,
                            'إضافة ' + ext.name,
                            ext.class,
                            ext.loaded ? 'مثبتة' : 'غير مثبتة (اختياري)'
                        );
                    });
                }
                
                if (data.all_ok) {
                    showMessage('msg-step1', '&#9989; جميع المتطلبات متوفرة! يمكنك المتابعة.', 'success');
                    document.getElementById('btn-check').style.display = 'none';
                    document.getElementById('btn-next-1').style.display = 'inline-flex';
                } else {
                    showMessage('msg-step1', '&#10060; بعض المتطلبات غير متوفرة. يرجى تثبيتها ثم إعادة المحاولة.', 'error');
                }
                
            } catch (error) {
                showMessage('msg-step1', '&#10060; خطأ: ' + error.message, 'error');
            }
            
            setLoading('btn-check', 'btn-check-text', false);
        }
        
        async function checkPermissions() {
            setLoading('btn-perm', 'btn-perm-text', true);
            hideMessage('msg-step2');
            
            try {
                const formData = new FormData();
                formData.append('api_action', 'check_permissions');
                
                const response = await fetch('?action=api', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                const permList = document.getElementById('perm-list');
                permList.innerHTML = '';
                
                data.checks.forEach(check => {
                    const status = check.ok ? 'قابل للكتابة' : (check.exists ? 'غير قابل للكتابة' : 'غير موجود');
                    permList.innerHTML += createCheckItem(
                        'perm-' + check.path.replace(/[^a-zA-Z0-9]/g, '-'),
                        check.path,
                        check.class,
                        status
                    );
                });
                
                if (data.all_ok) {
                    showMessage('msg-step2', '&#9989; جميع الصلاحيات متوفرة!', 'success');
                    document.getElementById('btn-perm').style.display = 'none';
                    document.getElementById('btn-next-2').style.display = 'inline-flex';
                } else {
                    showMessage('msg-step2', '&#10060; بعض المجلدات تحتاج صلاحيات كتابة. استخدم: chmod 755 أو chmod 777', 'error');
                }
                
            } catch (error) {
                showMessage('msg-step2', '&#10060; خطأ: ' + error.message, 'error');
            }
            
            setLoading('btn-perm', 'btn-perm-text', false);
        }
        
        async function startInstall() {
            setLoading('btn-install', 'btn-install-text', true);
            hideMessage('msg-step3');
            
            const progressBar = document.getElementById('progress-bar');
            const installLog = document.getElementById('install-log');
            installLog.style.display = 'block';
            installLog.innerHTML = '';
            
            function log(message, type = 'info') {
                const line = document.createElement('div');
                line.className = 'log-line log-' + type;
                line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + message;
                installLog.appendChild(line);
                installLog.scrollTop = installLog.scrollHeight;
            }
            
            progressBar.classList.add('animating');
            log('بدء عملية التثبيت...', 'info');
            
            try {
                const formData = new FormData();
                formData.append('api_action', 'install');
                
                const response = await fetch('?action=api', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.messages) {
                    data.messages.forEach(msg => log(msg, 'success'));
                }
                
                if (data.errors && data.errors.length > 0) {
                    data.errors.forEach(err => log(err, 'error'));
                }
                
                if (data.success) {
                    log('&#9989; التثبيت اكتمل بنجاح!', 'success');
                    showMessage('msg-step3', '&#127881; تم تثبيت المشروع بنجاح!', 'success');
                    document.getElementById('btn-install').style.display = 'none';
                    document.getElementById('btn-next-3').style.display = 'inline-flex';
                } else {
                    showMessage('msg-step3', '&#10060; حدثت أخطاء أثناء التثبيت', 'error');
                }
                
            } catch (error) {
                log('&#10060; خطأ: ' + error.message, 'error');
                showMessage('msg-step3', '&#10060; خطأ: ' + error.message, 'error');
            }
            
            progressBar.classList.remove('animating');
            setLoading('btn-install', 'btn-install-text', false);
        }
        
        async function cleanupInstall() {
            const cleanupLog = document.getElementById('cleanup-log');
            cleanupLog.style.display = 'block';
            cleanupLog.innerHTML = '';
            
            function log(message, type = 'info') {
                const line = document.createElement('div');
                line.className = 'log-line log-' + type;
                line.textContent = message;
                cleanupLog.appendChild(line);
            }
            
            log('جاري حذف ملفات التثبيت...', 'info');
            
            try {
                const formData = new FormData();
                formData.append('api_action', 'cleanup');
                
                const response = await fetch('?action=api', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.removed && data.removed.length > 0) {
                    data.removed.forEach(f => log('&#9989; تم حذف: ' + f, 'success'));
                }
                
                if (data.failed && data.failed.length > 0) {
                    data.failed.forEach(f => log('&#10060; لم يتم حذف: ' + f + ' (احذفه يدوياً)', 'error'));
                }
                
                log('&#127881; اكتمل! سيتم تحويلك للموقع...', 'success');
                
                setTimeout(() => {
                    window.location.href = '<?php echo $baseUrl; ?>/index.html';
                }, 2000);
                
            } catch (error) {
                log('&#10060; خطأ: ' + error.message, 'error');
            }
        }
        
        async function changeInstallPassword() {
            const currentPass = document.getElementById('install-current-pass').value;
            const newPass = document.getElementById('install-new-pass').value;
            const confirmPass = document.getElementById('install-confirm-pass').value;
            const resultDiv = document.getElementById('password-change-result');
            
            // Validation
            if (!currentPass || !newPass || !confirmPass) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<div style="padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">جميع الحقول مطلوبة</div>';
                return;
            }
            
            if (newPass !== confirmPass) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<div style="padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">كلمة المرور الجديدة غير متطابقة</div>';
                return;
            }
            
            if (newPass.length < 4) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<div style="padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">كلمة المرور يجب أن تكون 4 أحرف على الأقل</div>';
                return;
            }
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div style="padding: 10px; background: #eff6ff; border: 1px solid #1a56db; border-radius: 8px; color: #1e40af; font-size: 13px;">جاري التغيير...</div>';
            
            try {
                const formData = new FormData();
                formData.append('api_action', 'set_password');
                formData.append('current_password', currentPass);
                formData.append('new_password', newPass);
                
                const response = await fetch('?action=api', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = '<div style="padding: 10px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; color: #065f46; font-size: 13px;">&#9989; ' + data.message + '</div>';
                    document.getElementById('default-password-display').textContent = '******** (تم التغيير)';
                    document.getElementById('install-current-pass').value = '';
                    document.getElementById('install-new-pass').value = '';
                    document.getElementById('install-confirm-pass').value = '';
                } else {
                    resultDiv.innerHTML = '<div style="padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">&#10060; ' + data.message + '</div>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<div style="padding: 10px; background: #fef2f2; border: 1px solid #ef4444; border-radius: 8px; color: #991b1b; font-size: 13px;">&#10060; خطأ: ' + error.message + '</div>';
            }
        }
        
        // Auto-start check on step 1
        document.addEventListener('DOMContentLoaded', function() {
            // Pre-check on load
            setTimeout(checkRequirements, 500);
        });
    </script>
</body>
</html>
