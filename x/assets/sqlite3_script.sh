#!/bin/bash
sqlite3 chat.db "SELECT text, ROWID from message WHERE is_sent=0 order by rowid desc limit 5"