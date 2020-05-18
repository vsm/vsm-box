/**
 * Protects a string that will be used literally in `v-html` props,
 * against <script> and other injection attacks.
 */
export default function sanitizeHtml(str) {
  return str.replace(/<(\s*(script|iframe|style|textarea)\W)/gi, '&lt;$1');
}
