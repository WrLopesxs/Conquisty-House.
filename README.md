# Conquist House CRM

## API com Google Apps Script

Backend pronto em:
- `apps-script/Code.gs`

### Como publicar

1. Abra sua planilha de leads.
2. Vá em `Extensoes -> Apps Script`.
3. Cole o conteúdo de `apps-script/Code.gs`.
4. Salve e clique em `Implantar -> Nova implantacao -> App da Web`.
5. Execute como: `Voce`.
6. Quem tem acesso: `Qualquer pessoa`.
7. Copie a URL final no formato:
   `https://script.google.com/macros/s/SEU_DEPLOY_ID/exec`

### Conectar no front

No `dashboard.html`, antes do script principal, defina:

```html
<script>
  window.CONQUIST_API_BASE = "https://script.google.com/macros/s/SEU_DEPLOY_ID/exec";
</script>
```

Ou altere diretamente em `js/api.js`.

### Teste de endpoint

```text
https://script.google.com/macros/s/SEU_DEPLOY_ID/exec?corretor=renata
```

Corretores aceitos:
- `renata`, `alisom`, `gisele`, `juliane`, `kener`, `clovis`, `thaize`, `tiago`
