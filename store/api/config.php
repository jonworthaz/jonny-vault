<?php
/* ============================================================================
 * Lumen Commerce — server configuration  (Hostinger / any PHP host)
 * ----------------------------------------------------------------------------
 * EDIT THE VALUES BELOW, then upload this file to:  /store/api/config.php
 *
 * This file is only needed if you want real customer orders to reach you on
 * your own host (checkout mode "server"). On a static host you can ignore it.
 * ==========================================================================*/
return array(

  // Where new-order emails are sent. Use an inbox you actually read.
  "owner_email" => "you@base-reality.com",

  // The "From" address on those emails. On Hostinger this should be a real
  // mailbox on your domain (create one in hPanel → Emails) so it isn't
  // flagged as spam, e.g. "orders@base-reality.com".
  "from_email"  => "orders@base-reality.com",

  // Shown in the email subject/body.
  "store_name"  => "Base Reality",

  // SECRET. Protects the admin's "Sync orders" feature so only YOU can read
  // your orders back. Change this to a long random string and keep it private.
  // Put the SAME value in the Admin app → Settings → Server admin key.
  "admin_key"   => "CHANGE-ME-to-a-long-random-string-2f9d1c7a",

);
