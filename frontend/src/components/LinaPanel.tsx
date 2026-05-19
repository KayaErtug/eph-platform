"use client";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "lina"; text: string };

const LINA_SYSTEM = `Sen Lina'sın — EPH'nin AI emlak danışmanı asistanısın. Kullanıcıdan yeni emlak ilanı bilgilerini doğal sohbet yoluyla topluyorsun.

KONUŞMA KURALLARI:
- Her mesajda sadece 1-2 soru sor, asla form gibi peşpeşe sorma.
- İnsan gibi konuş: "Harika! Peki bu daire hangi ilçede?" tarzında.
- Cevap alınca kısa onay ver, sonra devam et.
- Bir sorunun net cevabını almadan bir sonrakine geçme.

GÜVENLİK KURALLARI:
- ASLA kullanıcıdan almadığın bilgileri uydurma.
- Manzara, metro, sosyal alan, site özellikleri kullanıcı söylemediyse YAZMA.
- Eksik bilgi varsa varsayım yapma, sor.
- Zorunlu alanlar tamamlanmadan JSON üretme.

MÜKERRER KONTROL:
- Kullanıcı proje adını söyleyince şunu sor: "Bu proje sistemde kayıtlı olabilir — mevcut projeye yeni bağımsız bölüm mü ekliyorsunuz, yoksa yeni proje mi açıyoruz?"

ZORUNLU BİLGİLER (sırayla topla):
1. İlan tipi: Satılık / Kiralık / Günlük Kiralık / Devren / Proje / Arsa
2. Portföy türü: Daire / Villa / Arsa / Dükkan / Ofis / Depo / Residence / Diğer
3. Proje veya bina adı
4. Şehir → İlçe → Mahalle → Açık adres (sırayla sor)
5. Brüt m² ve Net m²
6. Oda sayısı (1+1, 2+1 vb.) — konut değilse atla
7. Bulunduğu kat ve binanın toplam kat sayısı
8. Bina yaşı
9. Tapu durumu: Kat Mülkiyeti / Kat İrtifakı / Hisseli / Müstakil
10. Fiyat (TL) — pazarlığa açık mı?
11. Yetki durumu: Yetkili / Paylaşımlı / Yetki yok

EK BİLGİLER (kısaca sor):
- Kullanım durumu: Boş / Kiracılı / Mülk sahibi oturuyor
- Isıtma tipi (Kombi / Merkezi / Yerden / Klima)
- Aidat (varsa)
- Krediye uygun mu?
- Takas var mı?
- Cephe (Güney/Kuzey/Doğu/Batı)

SONUNDA (sadece verilen bilgilere dayanarak) üret:
- Profesyonel ilan başlığı
- SEO uyumlu ilan açıklaması
- Etiketler (sadece gerçek bilgilere dayalı, uydurma)
- İhtiyatlı fiyat yorumu

Tüm zorunlu bilgiler tamamlanınca şu formatta özet ver:
JSON_START
{"proje":{"name":"...","city":"...","district":"...","neighborhood":"...","address":"..."},"birim":{"type":"...","number":"...","floor":0,"totalFloors":0,"grossArea":0,"netArea":0,"roomCount":"...","buildingAge":0,"heating":"...","deedStatus":"...","usageStatus":"...","creditEligible":true,"swap":false,"dues":0,"price":0,"negotiable":true,"listingType":"...","title":"...","description":"...","tags":"..."}}
JSON_END

Türkçe konuş, samimi ve profesyonel ol. Form hissi değil, danışman hissi ver.`;

export default function LinaPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "lina", text: "Merhaba! Ben Lina 👋 Size profesyonel bir emlak ilanı hazırlayalım. Önce söyler misiniz — bu ilan satılık mı, kiralık mı, yoksa başka bir türde mi?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);


  const speakResponse = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = "tr-TR";
      utt.rate = 1.05;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const trVoice = voices.find(v => v.lang.startsWith("tr"));
      if (trVoice) utt.voice = trVoice;
      utt.onstart = () => setSpeaking(true);
      utt.onend = () => setSpeaking(false);
      utt.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      doSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); };
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMessages: Message[] = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/lina-stok", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({
          message: text,
          history: newMessages.map(m => ({ role: m.role === "lina" ? "assistant" : "user", content: m.text })),
          system: LINA_SYSTEM
        })
      });
      const data = await res.json();
      const reply = data.reply || "Bir sorun oluştu.";
      setMessages(prev => [...prev, { role: "lina", text: reply }]);
      speakResponse(reply);

      // JSON özet var mı kontrol et
      const jsonMatch = reply.match(/JSON_START([\s\S]*?)JSON_END/);
      if (jsonMatch) {
        try { setSummary(JSON.parse(jsonMatch[1].trim())); } catch {}
      }
    } catch (err: any) {
      console.error("Lina hata:", err);
      setMessages(prev => [...prev, { role: "lina", text: "Bağlantı hatası oluştu." }]);
    }
    setLoading(false);
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(track => track.stop());
      setTranscribing(true);
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, "ses.webm");
      const res = await fetch("/api/whisper", { method: "POST", body: fd });
      const data = await res.json();
      setTranscribing(false);
      if (data.text) {
        setTranscript(data.text);
        setTimeout(() => { setTranscript(""); sendMessage(data.text); }, 1200);
      }
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const saveStock = async () => {
    if (!summary) return;
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const projRes = await fetch(`${API}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(summary.proje)
      });
      const proj = await projRes.json();
      await fetch(`${API}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...summary.birim, projectId: proj.id })
      });
      setSaved(true);
    } catch (err: any) { console.error("Kayıt hatası:", err); alert("Kayıt hatası!"); }
    setSaving(false);
  };

  const reset = () => {
    setMessages([{ role: "lina", text: "Merhaba! Ben Lina 👋 Size profesyonel bir emlak ilanı hazırlayalım. Önce söyler misiniz — bu ilan satılık mı, kiralık mı, yoksa başka bir türde mi?" }]);
    setSummary(null); setSaved(false); setInput("");
  };

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:1001 }} />
      <div style={{
        position:"fixed",top:0,right:0,height:"100dvh",width:"min(420px, 100vw)",
        background:"#fff",zIndex:1002,display:"flex",flexDirection:"column",
        boxShadow:"-4px 0 30px rgba(0,0,0,0.2)"
      }}>
        {/* Header */}
        <div style={{ padding:"20px 24px",borderBottom:"1px solid #eee",display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:"linear-gradient(135deg,#1A3C5E,#C9A84C)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>🤖</div>
          <div>
            <div style={{ fontWeight:700,fontSize:16,color:"#1A3C5E" }}>Lina AI</div>
            <div style={{ fontSize:11,color:"#999" }}>Stok Asistanı</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8}}>
          {speaking && (
            <div style={{display:"flex",alignItems:"center",gap:4,background:"#EEF8F0",padding:"4px 10px",borderRadius:20}}>
              <div style={{display:"flex",gap:2,alignItems:"center"}}>
                {[1,2,3,4].map(i => <div key={i} style={{width:3,background:"#2D6A4F",borderRadius:2,height:i%2===0?14:8,animation:"wave 0.8s ease-in-out infinite",animationDelay:`${i*0.15}s`}} />)}
              </div>
              <span style={{fontSize:10,color:"#2D6A4F",fontWeight:500}}>Lina konuşuyor</span>
              <button onClick={()=>{window.speechSynthesis.cancel();setSpeaking(false);}} style={{background:"none",border:"none",cursor:"pointer",color:"#2D6A4F",fontSize:14,padding:0}}>⏹</button>
            </div>
          )}
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,cursor:"pointer",color:"#999"}}>×</button>
        </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12,WebkitOverflowScrolling:"touch" }}>
          {messages.map((m, i) => (
            <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
              <div style={{
                maxWidth:"80%",padding:"10px 14px",borderRadius:12,fontSize:13,lineHeight:1.5,
                background:m.role==="user"?"#1A3C5E":"#F5F3EF",
                color:m.role==="user"?"#fff":"#1A1A1A"
              }}>{m.text}</div>
            </div>
          ))}
          {loading && (
            <div style={{ display:"flex",gap:4,padding:"10px 14px",background:"#F5F3EF",borderRadius:12,width:"fit-content" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6,height:6,borderRadius:"50%",background:"#C9A84C",animation:`bounce 1s ${i*0.2}s infinite` }} />)}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Özet onay ekranı */}
        {summary && !saved && (
          <div style={{ padding:"16px 20px",borderTop:"1px solid #eee",background:"#FFFDF7" }}>
            <div style={{ fontSize:12,fontWeight:700,color:"#1A3C5E",marginBottom:8 }}>📋 ÖZET — Onaylıyor musun?</div>
            <div style={{ fontSize:11,color:"#555",marginBottom:12,lineHeight:1.8 }}>
              <b>Proje:</b> {summary.proje?.name} / {summary.proje?.city} {summary.proje?.district}<br/>
              <b>Birim:</b> {summary.birim?.type} No:{summary.birim?.number} Kat:{summary.birim?.floor} {summary.birim?.area}m² {summary.birim?.price?.toLocaleString("tr-TR")} TL
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={saveStock} disabled={saving} style={{ flex:1,padding:"10px",background:"#1A3C5E",color:"#fff",border:"none",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:600 }}>
                {saving ? "Kaydediliyor..." : "✅ Onayla ve Kaydet"}
              </button>
              <button onClick={reset} style={{ padding:"10px 16px",background:"#eee",border:"none",borderRadius:6,cursor:"pointer",fontSize:13 }}>İptal</button>
            </div>
          </div>
        )}

        {saved && (
          <div style={{ padding:"20px",borderTop:"1px solid #eee",textAlign:"center" }}>
            <div style={{ fontSize:32,marginBottom:8 }}>🎉</div>
            <div style={{ fontWeight:700,color:"#2D6A4F",marginBottom:12 }}>Stok başarıyla kaydedildi!</div>
            <button onClick={reset} style={{ padding:"10px 24px",background:"#1A3C5E",color:"#fff",border:"none",borderRadius:6,cursor:"pointer" }}>Yeni Stok Ekle</button>
          </div>
        )}

        {/* Ses durumu göstergesi */}
        {(recording || transcribing || transcript) && (
          <div style={{ padding:"12px 20px", background: recording ? "#FFF0F0" : "#F0F7FF", borderTop:"1px solid #eee", display:"flex", alignItems:"center", gap:10 }}>
            {recording && (
              <>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#FF4444", animation:"pulse 1s infinite" }} />
                <span style={{ fontSize:12, color:"#FF4444", fontWeight:500 }}>Dinleniyor...</span>
                <span style={{ fontSize:11, color:"#999", marginLeft:"auto" }}>Durdurmak için basın</span>
              </>
            )}
            {transcribing && !recording && (
              <>
                <div style={{ width:10, height:10, borderRadius:"50%", background:"#1A3C5E" }} />
                <span style={{ fontSize:12, color:"#1A3C5E" }}>Yazıya çevriliyor...</span>
              </>
            )}
            {transcript && !transcribing && (
              <>
                <span style={{ fontSize:12, color:"#2D6A4F" }}>✓</span>
                <span style={{ fontSize:12, color:"#1A1A1A", fontStyle:"italic" }}>{transcript}</span>
              </>
            )}
          </div>
        )}
        {/* Input */}
        {!summary && !saved && (
          <div style={{ padding:"16px 20px",paddingBottom:"max(16px, env(safe-area-inset-bottom))",borderTop:"1px solid #eee",display:"flex",gap:8,background:"#fff",position:"sticky",bottom:0,zIndex:10 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && sendMessage(input)}
              placeholder="Mesaj yaz..." disabled={loading}
              style={{ flex:1,padding:"10px 14px",borderRadius:8,border:"1px solid #ddd",fontSize:13,outline:"none" }} />
            <button onClick={recording ? stopRecording : startRecording}
              style={{ padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:18,
                background:recording?"#ff4444":"#F5F3EF" }}>
              {recording ? "⏹" : "🎤"}
            </button>
            <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
              style={{ padding:"10px 16px",background:"#1A3C5E",color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>
              Gönder
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
    </>
  );
}
