# Design Spec Generator - セキュリティ要件

このドキュメントは、Design Spec Generatorアプリケーション開発時に遵守すべきセキュリティ要件をまとめています。実装前に必ずこのファイルを確認してください。

## 🔒 基本原則

### 1. データベースアクセス制限
- **❌ 禁止**: フロントエンドから直接Supabaseデータベースにアクセス
- **✅ 必須**: APIルート経由でのデータベース操作のみ許可
- **理由**: クライアントサイドでの直接DB操作は認証バイパスやデータ漏洩のリスクがある

```typescript
// ❌ 悪い例 - フロントエンドでの直接DB操作
const { data } = await supabase.from('user_usage').select('*');

// ✅ 良い例 - API経由でのデータ取得
const response = await fetch('/api/usage', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### 2. 認証・認可
- **JWT認証**: 全APIエンドポイントでJWT認証を必須とする
- **Bearerトークン**: HTTPヘッダーでの認証情報送信
- **セッション管理**: 適切なセッション有効期限設定

```typescript
// API認証チェックテンプレート
const authHeader = request.headers.get('authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

const token = authHeader.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 });
}
```

## 🛡️ API設計要件

### 1. エンドポイント設計
- **最小権限**: 必要最小限のデータのみ返却
- **入力検証**: 全ての入力パラメータを検証
- **エラーハンドリング**: 適切なHTTPステータスコードとエラーメッセージ

### 2. レート制限
- **実装必須**: 全APIエンドポイントでレート制限を実装
- **設定値**: 通常8req/min、分析API等は更に制限
- **IPベース**: クライアントIP毎の制限

```typescript
// レート制限実装例
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const maxRequests = 8; // 1分間の最大リクエスト数
const windowMs = 60 * 1000; // 1分
```

### 3. 使用量制限
- **月次制限**: ユーザー毎の月次使用制限チェック
- **リアルタイム更新**: 使用量の即座な反映
- **制限超過時**: 適切なエラー応答とアップグレード案内

## 📁 ファイル処理セキュリティ

### 1. ファイルアップロード
- **サイズ制限**: 最大50MB
- **形式制限**: 許可されたMIMEタイプのみ
- **検証**: ファイル内容とMIMEタイプの整合性確認

```typescript
// ファイル検証例
const ALLOWED_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  VIDEO: ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi']
};

if (file.size > 50 * 1024 * 1024) {
  return { error: 'File size exceeds 50MB limit' };
}
```

### 2. ストレージ管理
- **バケット分離**: ファイルタイプ毎の適切なバケット使用
- **アクセス制御**: Supabase RLSポリシーによる制御
- **URL生成**: 公開URLの適切な管理

## 🔍 ログ・モニタリング

### 1. ログ管理
- **本番環境**: 秘密情報（APIキー、トークン等）のログ出力禁止
- **開発環境**: デバッグ情報の条件付きログ出力
- **構造化ログ**: JSON形式での統一されたログ出力

```typescript
// ログ出力例
if (process.env.NODE_ENV === 'development') {
  console.log('Debug info:', { userId: user.id, fileSize: file.size });
}

// ❌ 本番でも出力される危険なログ
console.log('API Key:', process.env.GEMINI_API_KEY); // 絶対禁止
```

### 2. エラーハンドリング
- **適切な情報開示**: 内部エラー詳細をクライアントに露出しない
- **統一されたエラー形式**: 一貫したエラーレスポンス構造
- **ログ出力**: サーバーサイドでの詳細エラーログ記録

## 🗄️ データベースセキュリティ

### 1. Row Level Security (RLS)
- **全テーブル**: RLSポリシーの適用必須
- **ユーザー分離**: 各ユーザーは自分のデータのみアクセス可能
- **適切な権限**: 読み書き権限の最小化

```sql
-- RLSポリシー例
CREATE POLICY "Users can only access their own usage" ON user_usage
FOR ALL USING (auth.uid() = user_id);
```

### 2. データ暗号化
- **保存時暗号化**: Supabaseの標準暗号化を活用
- **転送時暗号化**: HTTPS通信の徹底
- **機密データ**: 特に機密性の高いデータの追加暗号化検討

## 🌐 フロントエンド要件

### 1. 認証状態管理
- **セッション確認**: API呼び出し前の認証状態確認
- **自動リダイレクト**: 未認証時の適切なリダイレクト
- **トークン管理**: セキュアなトークン保存・更新

### 2. 入力検証
- **クライアントサイド**: 基本的な入力検証
- **サーバーサイド**: 厳密な検証（クライアント検証を信頼しない）
- **XSS対策**: 適切なサニタイゼーション

```typescript
// フロントエンド認証確認例
const { data: { session } } = await supabase.auth.getSession();
if (!session?.access_token) {
  throw new Error('Authentication required. Please log in again.');
}
```

## 🔧 環境・設定管理

### 1. 環境変数
- **機密情報**: 全ての機密情報を環境変数で管理
- **検証**: 起動時の必須環境変数存在確認
- **分離**: 環境毎の適切な設定分離

### 2. 依存関係管理
- **定期更新**: セキュリティパッチの適時適用
- **脆弱性チェック**: 定期的な依存関係脆弱性スキャン
- **最小依存**: 不要な依存関係の除去

## ✅ 実装チェックリスト

新機能実装時は以下を必ず確認：

- [ ] フロントエンドから直接DB操作していない
- [ ] APIエンドポイントで認証チェック実装
- [ ] 適切なレート制限設定
- [ ] 入力検証・サニタイゼーション実装
- [ ] エラーハンドリング適切に実装
- [ ] ログ出力で機密情報露出していない
- [ ] RLSポリシー適用確認
- [ ] HTTPSでの通信確保
- [ ] 適切なHTTPステータスコード使用
- [ ] 最小権限でのデータアクセス

## 🚨 インシデント対応

セキュリティ問題発見時の対応手順：

1. **即座の対応**: 問題の特定と影響範囲の確認
2. **一時措置**: 必要に応じてサービス一時停止
3. **根本対策**: セキュリティ修正の実装
4. **検証**: 修正内容の十分なテスト
5. **デプロイ**: 修正版のデプロイ
6. **事後分析**: 原因分析と再発防止策検討

## 📚 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

---

**重要**: このセキュリティ要件は生きた文書です。新しい脅威や要件変更に応じて定期的に更新してください。