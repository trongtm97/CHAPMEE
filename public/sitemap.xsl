<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/1999/xhtml"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html lang="vi">
      <head>
        <title>XML Sitemap — ChapMee</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style type="text/css">
          :root {
            color-scheme: light dark;
            --bg: #0b0f14;
            --panel: #121820;
            --border: rgba(255, 255, 255, 0.08);
            --text: #e8edf3;
            --muted: #8b97a8;
            --accent: #22d3ee;
            --row: rgba(255, 255, 255, 0.02);
            --row-hover: rgba(34, 211, 238, 0.08);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            background: linear-gradient(180deg, #0b0f14 0%, #101722 100%);
            color: var(--text);
          }
          .wrap { max-width: 1180px; margin: 0 auto; padding: 28px 20px 48px; }
          .hero {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 22px 24px;
            margin-bottom: 18px;
          }
          h1 { margin: 0 0 8px; font-size: 1.45rem; letter-spacing: -0.02em; }
          p { margin: 0; color: var(--muted); }
          a { color: var(--accent); text-decoration: none; }
          a:hover { text-decoration: underline; }
          .badge {
            display: inline-block;
            margin-top: 12px;
            padding: 4px 10px;
            border-radius: 999px;
            border: 1px solid rgba(34, 211, 238, 0.25);
            background: rgba(34, 211, 238, 0.08);
            color: #b8f4ff;
            font-size: 12px;
            font-weight: 600;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 16px;
            overflow: hidden;
          }
          th, td {
            text-align: left;
            padding: 12px 14px;
            border-bottom: 1px solid var(--border);
            vertical-align: top;
          }
          th {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: var(--muted);
            background: rgba(255, 255, 255, 0.02);
          }
          tr:nth-child(even) td { background: var(--row); }
          tr:hover td { background: var(--row-hover); }
          .url { word-break: break-all; font-weight: 500; }
          .num { text-align: right; white-space: nowrap; color: var(--muted); }
          .footer { margin-top: 16px; color: var(--muted); font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <xsl:choose>
            <xsl:when test="sitemap:sitemapindex">
              <div class="hero">
                <h1>XML Sitemap Index</h1>
                <p>
                  Sơ đồ trang được tách theo nhóm nội dung (tối đa 200 URL / file) để Google và
                  trình thu thập dữ liệu xử lý nhanh hơn.
                </p>
                <span class="badge">ChapMee SEO Sitemap</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Sitemap</th>
                    <th class="num">Cập nhật</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                    <tr>
                      <td class="url">
                        <a>
                          <xsl:attribute name="href">
                            <xsl:value-of select="sitemap:loc" />
                          </xsl:attribute>
                          <xsl:value-of select="sitemap:loc" />
                        </a>
                      </td>
                      <td class="num">
                        <xsl:value-of select="sitemap:lastmod" />
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
              <p class="footer">
                <xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)" /> sitemap con.
              </p>
            </xsl:when>
            <xsl:otherwise>
              <div class="hero">
                <h1>XML Sitemap</h1>
                <p>Danh sách URL công khai trong segment này.</p>
                <span class="badge">ChapMee SEO Sitemap</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>URL</th>
                    <th class="num">Cập nhật</th>
                    <th class="num">Tần suất</th>
                    <th class="num">Ưu tiên</th>
                  </tr>
                </thead>
                <tbody>
                  <xsl:for-each select="sitemap:urlset/sitemap:url">
                    <tr>
                      <td class="url">
                        <a>
                          <xsl:attribute name="href">
                            <xsl:value-of select="sitemap:loc" />
                          </xsl:attribute>
                          <xsl:value-of select="sitemap:loc" />
                        </a>
                      </td>
                      <td class="num">
                        <xsl:value-of select="sitemap:lastmod" />
                      </td>
                      <td class="num">
                        <xsl:value-of select="sitemap:changefreq" />
                      </td>
                      <td class="num">
                        <xsl:value-of select="sitemap:priority" />
                      </td>
                    </tr>
                  </xsl:for-each>
                </tbody>
              </table>
              <p class="footer">
                <xsl:value-of select="count(sitemap:urlset/sitemap:url)" /> URL trong file này.
              </p>
            </xsl:otherwise>
          </xsl:choose>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
