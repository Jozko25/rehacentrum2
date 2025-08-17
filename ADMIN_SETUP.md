# 🔐 Admin Panel Security Setup

## Overview
Admin panel is now secured with:
- ✅ Moved to `/admin` (hidden from root)
- ✅ IP whitelisting (supports mobile networks)
- ✅ HTTP Basic Authentication
- ✅ Protected sensitive endpoints

## 🚀 Quick Setup

### 1. Get Your IP Addresses
```bash
# From your computer
curl https://rehacentrum2-production.up.railway.app/my-ip

# From your mobile
# Visit: https://rehacentrum2-production.up.railway.app/my-ip
```

### 2. Add Environment Variables in Railway

**Required:**
```
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
```

**IP Whitelisting (choose one):**

**Option A: Specific IPs**
```
ADMIN_ALLOWED_IPS=192.168.1.100,89.172.45.123,178.143.12.45
```

**Option B: Network Ranges (for mobile + home)**
```
ADMIN_ALLOWED_NETWORKS=192.168.1,89.172,178.143,10.0
```

**Option C: Both (most flexible)**
```
ADMIN_ALLOWED_IPS=89.172.45.123
ADMIN_ALLOWED_NETWORKS=192.168.1,10.0,172.20
```

## 📱 Mobile Access Setup

### For Mobile Networks:
1. **Get mobile IP**: Visit `/my-ip` from mobile
2. **Add mobile network**: Use first 2-3 octets
   - Mobile IP: `89.172.45.123` 
   - Add network: `89.172` (covers entire mobile provider range)

### Common Mobile Network Prefixes:
- **Slovakia Mobile**: `89.172`, `89.173`, `213.81`
- **Orange SK**: `213.151`, `85.248`
- **Telekom SK**: `188.167`, `85.237`

## 🔗 Access URLs

- **Public API**: `https://rehacentrum2-production.up.railway.app/health`
- **Admin Panel**: `https://rehacentrum2-production.up.railway.app/admin`
- **IP Check**: `https://rehacentrum2-production.up.railway.app/my-ip`

## 🛡️ Security Features

### What's Protected:
- ✅ Admin dashboard (`/admin`)
- ✅ Log management (`/api/logs`)
- ✅ Event deletion (`/api/events/:date`)

### What's Public:
- ✅ Health check (`/health`)
- ✅ Appointment booking (`/api/booking/webhook`)
- ✅ Available slots (`/api/available-slots`)
- ✅ IP detection (`/my-ip`)

## 🔧 Testing Access

1. **Set credentials in Railway**
2. **Visit**: `https://rehacentrum2-production.up.railway.app/admin`
3. **Browser prompts**: Enter username/password
4. **Success**: See admin dashboard

## 📋 Troubleshooting

### "Access Denied" (403)
- Your IP is not whitelisted
- Check your IP: `/my-ip`
- Add IP/network to Railway environment

### "Authentication Required" (401)
- Missing or wrong credentials
- Check `ADMIN_USERNAME` and `ADMIN_PASSWORD` in Railway

### "Server Configuration Error" (500)
- Admin credentials not set in Railway
- Add `ADMIN_USERNAME` and `ADMIN_PASSWORD`

## 🎯 Recommended Setup

```bash
# Railway Environment Variables
ADMIN_USERNAME=admin
ADMIN_PASSWORD=Reha2025!SecurePass
ADMIN_ALLOWED_NETWORKS=192.168,10.0,172.20,89.172
ADMIN_ALLOWED_IPS=YOUR_OFFICE_IP
```

This allows access from:
- ✅ Home networks (192.168.x.x)
- ✅ Mobile networks (89.172.x.x)
- ✅ Corporate networks (10.x.x.x, 172.20.x.x)
- ✅ Specific office IP