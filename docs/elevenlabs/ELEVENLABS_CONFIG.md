# ElevenLabs Configuration for Rehacentrum

## Agent Prompt (Copy this to ElevenLabs Agent Prompt section)

```
Ste profesionálna recepčná v Rehacentre Humenné. Hovoríte len slovensky a ste zdvorilí, priateľskí a profesionálni. Vaším cieľom je pomôcť pacientom s rezerváciou termínov, zrušením alebo presunutím termínov.

**KRITICKÉ PRAVIDLÁ**:
- NIKDY nepovedzte "je obsadené" alebo "nemáme voľné" bez použitia nástroja get_available_slots
- Pri KAŽDEJ zmene času (napr. pacient povie "nie 9:00, ale 11:00") VŽDY použite nástroj s novým časom
- Pri oprave informácie o dostupnosti OKAMŽITE použite nástroj na overenie
- Všetky nástroje vracajú odpovede vo forme prirodzených slovenských viet - použite ich priamo

DÔLEŽITÉ: Všetky nástroje (tools) vracajú odpovede vo forme prirodzených slovenských viet. Nikdy neinterpretujte JSON štruktúry - použite odpoveď priamo tak, ako ju dostanete od nástroja.

## Dostupné služby:

### 1. Športová prehliadka (sportova_prehliadka)
- Cena: 130€ (nehradené poisťovňou)
- Doba: 7:00-8:40, každých 20 minút
- Požiadavky: Nalačno, prineste jedlo/vodu, športové oblečenie, hotovosť

### 2. Vstupné vyšetrenie (vstupne_vysetrenie)
- Cena: Hradené poisťovňou
- Doba: 9:00-11:30, 13:00-15:00, každých 10 minút
- Požiadavky: Výmenný lístok od lekára (povinný), zdravotná karta

### 3. Kontrolné vyšetrenie (kontrolne_vysetrenie)
- Cena: Hradené poisťovňou
- Doba: 9:00-11:30, 13:00-15:00, každých 10 minút
- Požiadavky: Zdravotná karta

### 4. Zdravotnícke pomôcky (zdravotnicke_pomocky)
- Cena: Hradené poisťovňou
- Doba: 9:00-11:30, 13:00-15:00, každých 10 minút
- Požiadavky: Lekárske správy, staré pomôcky na kontrolu

### 5. Konzultácia (konzultacia)
- Cena: 30€ (nehradené poisťovňou)
- Doba: 7:30-9:00, 15:00-16:00, každých 10 minút
- Požiadavky: Hotovosť, lekárske dokumenty

## Postup pri rezervácii:
1. Privítajte pacienta zdvorilo
2. Zistite typ potrebného vyšetrenia
3. **POVINNE**: Vyhľadajte voľné termíny pomocou get_available_slots (pri špecifickom čase použite parameter "time")
4. **NIKDY** nepovedzte dostupnosť bez použitia nástroja
5. Získajte údaje pacienta: meno, priezvisko, telefón, poisťovňa
6. Rezervujte termín (book_appointment)
7. Prečítajte odpoveď nástroja priamo pacientovi

## Nástroje:
- get_available_slots - voľné termíny pre konkrétny dátum
- find_closest_slot - najbližší voľný termín
- book_appointment - vytvorenie rezervácie
- cancel_appointment - zrušenie termínu (overte totožnosť!)
- reschedule_appointment - presunutie termínu
- send_fallback_sms - núdzová SMS

## Pravidlá:
- **ABSOLÚTNY ZÁKAZ**: Povedať "je obsadené" bez použitia nástroja get_available_slots
- **POVINNÉ**: Pri zmene času VŽDY použite nástroj s novým časom (parameter "time": "11:10")
- **POVINNÉ**: Pri otázke dostupnosti času VŽDY použite nástroj
- Vždy overte údaje pred rezerváciou
- Pri zrušení/presune overte meno a telefón
- Použite odpovede nástrojov priamo - sú už v slovenčine
- Pre nástroje používajte: YYYY-MM-DD formát dátumu, presné názvy typov vyšetrení
- Hovorte prirodzene s pacientmi (napr. "pondelok 18. augusta" namiesto "2025-08-18")

Príklad privítania: "Dobrý deň, volajte do Rehacentra Humenné. Som Vaša asistentka pre rezervácie. Ako Vám môžem pomôcť?"
```

## Tools Configuration (Copy this to ElevenLabs Tools section)

```json
{
  "tools": [
    {
      "name": "get_available_slots",
      "description": "Vyhľadá všetky voľné termíny pre konkrétny dátum a typ vyšetrenia, môže kontrolovať špecifický čas",
      "parameters": {
        "type": "object",
        "properties": {
          "date": {
            "type": "string",
            "description": "Dátum v formáte YYYY-MM-DD"
          },
          "appointment_type": {
            "type": "string",
            "enum": ["sportova_prehliadka", "vstupne_vysetrenie", "kontrolne_vysetrenie", "zdravotnicke_pomocky", "konzultacia"],
            "description": "Typ vyšetrenia"
          },
          "time": {
            "type": "string",
            "description": "Špecifický čas pre kontrolu dostupnosti v formáte HH:MM (napr. 11:10, 08:00)",
            "pattern": "^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
          },
          "preferred_time": {
            "type": "string",
            "description": "Prirodzené slovenské časové výrazy ako 'ráno', 'dopoludnia', 'poobede', 'večer'"
          }
        },
        "required": ["date", "appointment_type"]
      }
    },
    {
      "name": "find_closest_slot",
      "description": "Nájde najbližší voľný termín pre daný typ vyšetrenia",
      "parameters": {
        "type": "object",
        "properties": {
          "appointment_type": {
            "type": "string",
            "enum": ["sportova_prehliadka", "vstupne_vysetrenie", "kontrolne_vysetrenie", "zdravotnicke_pomocky", "konzultacia"],
            "description": "Typ vyšetrenia"
          },
          "preferred_date": {
            "type": "string",
            "description": "Preferovaný dátum v formáte YYYY-MM-DD (nepovinné)"
          },
          "days_to_search": {
            "type": "integer",
            "description": "Počet dní na vyhľadávanie (predvolené: 7)",
            "default": 7
          }
        },
        "required": ["appointment_type"]
      }
    },
    {
      "name": "book_appointment",
      "description": "Vytvorí novú rezerváciu termínu",
      "parameters": {
        "type": "object",
        "properties": {
          "appointment_type": {
            "type": "string",
            "enum": ["sportova_prehliadka", "vstupne_vysetrenie", "kontrolne_vysetrenie", "zdravotnicke_pomocky", "konzultacia"],
            "description": "Typ vyšetrenia"
          },
          "date_time": {
            "type": "string",
            "description": "Dátum a čas termínu v ISO formáte (YYYY-MM-DDTHH:mm:ss)"
          },
          "patient_name": {
            "type": "string",
            "description": "Meno pacienta"
          },
          "patient_surname": {
            "type": "string",
            "description": "Priezvisko pacienta"
          },
          "phone": {
            "type": "string",
            "description": "Telefónne číslo v formáte +421XXXXXXXXX"
          },
          "insurance": {
            "type": "string",
            "description": "Názov poisťovne"
          }
        },
        "required": ["appointment_type", "date_time", "patient_name", "patient_surname", "phone", "insurance"]
      }
    },
    {
      "name": "cancel_appointment",
      "description": "Zruší existujúci termín - vyžaduje overenie totožnosti pacienta",
      "parameters": {
        "type": "object",
        "properties": {
          "patient_name": {
            "type": "string",
            "description": "Meno a priezvisko pacienta"
          },
          "phone": {
            "type": "string",
            "description": "Telefónne číslo pacienta"
          },
          "appointment_date": {
            "type": "string",
            "description": "Dátum termínu v formáte YYYY-MM-DD"
          }
        },
        "required": ["patient_name", "phone", "appointment_date"]
      }
    },
    {
      "name": "reschedule_appointment",
      "description": "Presunie existujúci termín na nový dátum a čas",
      "parameters": {
        "type": "object",
        "properties": {
          "patient_name": {
            "type": "string",
            "description": "Meno a priezvisko pacienta"
          },
          "phone": {
            "type": "string",
            "description": "Telefónne číslo pacienta"
          },
          "old_date": {
            "type": "string",
            "description": "Pôvodný dátum termínu v formáte YYYY-MM-DD"
          },
          "new_date_time": {
            "type": "string",
            "description": "Nový dátum a čas v ISO formáte (YYYY-MM-DDTHH:mm:ss)"
          }
        },
        "required": ["patient_name", "phone", "old_date", "new_date_time"]
      }
    },
    {
      "name": "send_fallback_sms",
      "description": "Pošle SMS správu keď AI asistent nedokáže dokončiť rezerváciu",
      "parameters": {
        "type": "object",
        "properties": {
          "phone": {
            "type": "string",
            "description": "Telefónne číslo pacienta"
          },
          "message": {
            "type": "string",
            "description": "Obsah SMS správy"
          }
        },
        "required": ["phone", "message"]
      }
    }
  ],
  "webhook_url": "https://rehacentrum2-production.up.railway.app/api/booking/webhook",
  "webhook_method": "POST",
  "webhook_timeout": 30000
}
```

## Setup Instructions

1. **Agent Configuration**: Copy the Agent Prompt section above and paste it into the ElevenLabs Agent Prompt field
2. **Tools Configuration**: Copy the Tools Configuration JSON above and paste it into the ElevenLabs Tools section
3. **Webhook URL**: Ensure the webhook URL is set to `https://rehacentrum2-production.up.railway.app/api/booking/webhook`
4. **Test**: Make a test call to verify the agent can access all tools and receives Slovak responses

## Key Features

✅ **Natural Slovak Responses** - All tools return human-readable Slovak sentences
✅ **Google Calendar Integration** - Automatic appointment creation with order numbers
✅ **Real-time Availability** - Live checking of appointment slots
✅ **SMS Notifications** - Automatic SMS confirmations (when enabled)
✅ **Full CRUD Operations** - Create, read, cancel, and reschedule appointments
✅ **Business Logic** - Automatic validation of working days, limits, and requirements
✅ **Error Handling** - Graceful failures with alternative suggestions

The system is now fully configured for production use with ElevenLabs AI agents!
