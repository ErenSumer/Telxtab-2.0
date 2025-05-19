-- Update email template for confirmation emails
UPDATE auth.email_templates
SET template = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm your email</title>
  <style>
    body {
      background-color: #0A0A0A;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .content {
      background: linear-gradient(to bottom right, rgba(88, 28, 135, 0.1), rgba(219, 39, 119, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #9333EA, #DB2777);
      color: white;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      margin-top: 32px;
    }
    .highlight {
      background: linear-gradient(to right, #9333EA, #DB2777);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1 class="highlight">Language Learning Platform</h1>
    </div>
    <div class="content">
      <h2>Welcome to Your Language Learning Journey!</h2>
      <p>Hi there,</p>
      <p>Thank you for signing up! To start your language learning adventure, please confirm your email address by clicking the button below:</p>
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
      </div>
      <p>This link will expire in 24 hours. If you didn''t create an account, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2024 Language Learning Platform. All rights reserved.</p>
      <p>If you''re having trouble clicking the button, copy and paste this URL into your web browser:</p>
      <p style="word-break: break-all; color: #9333EA;">{{ .ConfirmationURL }}</p>
    </div>
  </div>
</body>
</html>'
WHERE template_id::text = 'confirmation';

-- Update email template for recovery/reset password
UPDATE auth.email_templates
SET template = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password</title>
  <style>
    body {
      background-color: #0A0A0A;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .content {
      background: linear-gradient(to bottom right, rgba(88, 28, 135, 0.1), rgba(219, 39, 119, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #9333EA, #DB2777);
      color: white;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      margin-top: 32px;
    }
    .highlight {
      background: linear-gradient(to right, #9333EA, #DB2777);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1 class="highlight">Language Learning Platform</h1>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hi there,</p>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      </div>
      <p>This link will expire in 24 hours. If you didn''t request a password reset, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© 2024 Language Learning Platform. All rights reserved.</p>
      <p>If you''re having trouble clicking the button, copy and paste this URL into your web browser:</p>
      <p style="word-break: break-all; color: #9333EA;">{{ .ConfirmationURL }}</p>
    </div>
  </div>
</body>
</html>'
WHERE template_id::text = 'recovery';

-- Update email template for magic link
UPDATE auth.email_templates
SET template = '
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to your account</title>
  <style>
    body {
      background-color: #0A0A0A;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .content {
      background: linear-gradient(to bottom right, rgba(88, 28, 135, 0.1), rgba(219, 39, 119, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 32px;
      margin-bottom: 24px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(to right, #9333EA, #DB2777);
      color: white;
      text-decoration: none;
      padding: 12px 32px;
      border-radius: 8px;
      font-weight: 600;
      margin: 24px 0;
    }
    .footer {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      margin-top: 32px;
    }
    .highlight {
      background: linear-gradient(to right, #9333EA, #DB2777);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1 class="highlight">Language Learning Platform</h1>
    </div>
    <div class="content">
      <h2>Sign In to Your Account</h2>
      <p>Hi there,</p>
      <p>Click the button below to sign in to your account. No password needed!</p>
      <div style="text-align: center;">
        <a href="{{ .ConfirmationURL }}" class="button">Sign In</a>
      </div>
      <p>This link will expire in 24 hours and can only be used once.</p>
    </div>
    <div class="footer">
      <p>© 2024 Language Learning Platform. All rights reserved.</p>
      <p>If you''re having trouble clicking the button, copy and paste this URL into your web browser:</p>
      <p style="word-break: break-all; color: #9333EA;">{{ .ConfirmationURL }}</p>
    </div>
  </div>
</body>
</html>'
WHERE template_id::text = 'magic_link';

-- Update email template subjects
UPDATE auth.email_templates
SET subject = 'Welcome to Language Learning Platform - Confirm Your Email'
WHERE template_id::text = 'confirmation';

UPDATE auth.email_templates
SET subject = 'Reset Your Language Learning Platform Password'
WHERE template_id::text = 'recovery';

UPDATE auth.email_templates
SET subject = 'Sign in to Language Learning Platform'
WHERE template_id::text = 'magic_link'; 