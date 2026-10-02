import 'package:flutter/material.dart';

import '../../core/theme.dart';
import '../../widgets/common.dart';

class _Convo {
  final String name;
  final String lastMessage;
  final String time;
  final int unread;
  final Color avatarColor;
  final List<_Msg> messages;
  const _Convo(this.name, this.lastMessage, this.time, this.unread,
      this.avatarColor, this.messages);
}

class _Msg {
  final String text;
  final bool me;
  final String time;
  const _Msg(this.text, this.me, this.time);
}

class ChatList extends StatelessWidget {
  const ChatList({super.key});

  static const _convos = [
    _Convo(
      'NEXUS Support',
      'Your order #NX4821 has been delivered. Rate us?',
      '09:42',
      2,
      NexusTheme.primary,
      [
        _Msg('Hi! Your order was delivered just now. 🎉', false, '09:40'),
        _Msg('Thanks! Everything arrived in perfect condition.', true, '09:41'),
        _Msg('Your order #NX4821 has been delivered. Rate us?', false, '09:42'),
      ],
    ),
    _Convo(
      'Ravi · Driver',
      'I am 3 minutes away, at the main gate.',
      '09:12',
      1,
      NexusTheme.rideAccent,
      [
        _Msg('On my way, please be at the pickup point.', false, '09:10'),
        _Msg('Sure, coming down now.', true, '09:11'),
        _Msg('I am 3 minutes away, at the main gate.', false, '09:12'),
      ],
    ),
    _Convo(
      'Spice Kitchen',
      'Your food order is being prepared 👨‍🍳',
      'Yesterday',
      0,
      NexusTheme.foodAccent,
      [
        _Msg('Order received! The kitchen has started preparing.', false, '20:04'),
        _Msg('Great, thanks!', true, '20:05'),
        _Msg('Your food order is being prepared 👨‍🍳', false, '20:06'),
      ],
    ),
    _Convo(
      'Mom',
      'Did you eat? Call me when free.',
      'Yesterday',
      0,
      NexusTheme.chatAccent,
      [
        _Msg('Beta, did you eat?', false, '13:30'),
        _Msg('Yes mom 😄', true, '13:32'),
        _Msg('Did you eat? Call me when free.', false, '21:10'),
      ],
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(0, 10, 0, 24),
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 0),
              child: NexusHeader(
                title: 'Chats',
                subtitle: 'Encrypted · end-to-end by design',
              ),
            ),
            const SizedBox(height: 10),
            PromiseBanner(
              text: 'Messages are private — powered by NEXUS E2E keys',
              icon: Icons.lock_rounded,
              gradient: NexusTheme.chatGradient.colors,
            ),
            ..._convos.map((c) => _ChatTile(
                  convo: c,
                  onTap: () => _openThread(context, c),
                )),
          ],
        ),
      ),
    );
  }

  void _openThread(BuildContext context, _Convo convo) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _ChatThread(convo: convo)),
    );
  }
}

class _ChatTile extends StatelessWidget {
  final _Convo convo;
  final VoidCallback onTap;

  const _ChatTile({required this.convo, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
      leading: CircleAvatar(
        radius: 24,
        backgroundColor: convo.avatarColor.withOpacity(0.18),
        child: Text(convo.name[0],
            style: TextStyle(
                color: convo.avatarColor,
                fontWeight: FontWeight.w800,
                fontSize: 17)),
      ),
      title: Text(convo.name,
          style: const TextStyle(
              color: NexusTheme.textPrimary,
              fontWeight: FontWeight.w700,
              fontSize: 14.5)),
      subtitle: Text(
        convo.lastMessage,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(color: NexusTheme.textSecondary, fontSize: 12.5),
      ),
      trailing: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(convo.time,
              style: const TextStyle(
                  color: NexusTheme.textMuted, fontSize: 11)),
          if (convo.unread > 0) ...[
            const SizedBox(height: 4),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: NexusTheme.chatAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text('${convo.unread}',
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800)),
            ),
          ],
        ],
      ),
    );
  }
}

class _ChatThread extends StatefulWidget {
  final _Convo convo;
  const _ChatThread({required this.convo});

  @override
  State<_ChatThread> createState() => _ChatThreadState();
}

class _ChatThreadState extends State<_ChatThread> {
  final _ctrl = TextEditingController();
  final _scroll = ScrollController();
  late List<_Msg> _messages = [...widget.convo.messages];

  @override
  void dispose() {
    _ctrl.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send() {
    final text = _ctrl.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _messages.add(_Msg(text, true, 'now'));
    });
    _ctrl.clear();
    Future.delayed(const Duration(milliseconds: 120), () {
      if (_scroll.hasClients) {
        _scroll.animateTo(_scroll.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut);
      }
    });
    // Demo auto-reply (real messages ship with the Messaging module).
    Future.delayed(const Duration(seconds: 1), () {
      if (!mounted) return;
      setState(() {
        _messages.add(_Msg('Got it! 👍 (demo auto-reply — live messaging ships with the Messaging module)', false, 'now'));
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor:
                  widget.convo.avatarColor.withOpacity(0.2),
              child: Text(widget.convo.name[0],
                  style: TextStyle(
                      color: widget.convo.avatarColor,
                      fontWeight: FontWeight.w800,
                      fontSize: 13)),
            ),
            const SizedBox(width: 10),
            Text(widget.convo.name, style: const TextStyle(fontSize: 16)),
          ],
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scroll,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, i) {
                final m = _messages[i];
                return Align(
                  alignment:
                      m.me ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 13, vertical: 9),
                    constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.75),
                    decoration: BoxDecoration(
                      color: m.me
                          ? NexusTheme.chatAccent.withOpacity(0.25)
                          : NexusTheme.surfaceLight,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft:
                            Radius.circular(m.me ? 16 : 4),
                        bottomRight:
                            Radius.circular(m.me ? 4 : 16),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.text,
                            style: const TextStyle(
                                color: NexusTheme.textPrimary,
                                fontSize: 13.5, height: 1.3)),
                        const SizedBox(height: 3),
                        Text(m.time,
                            style: const TextStyle(
                                color: NexusTheme.textMuted, fontSize: 9.5)),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.fromLTRB(14, 8, 14, 10),
              decoration: const BoxDecoration(color: NexusTheme.background),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _ctrl,
                      onSubmitted: (_) => _send(),
                      decoration: InputDecoration(
                        hintText: 'Message…',
                        prefixIcon: const Icon(Icons.emoji_emotions_outlined,
                            color: NexusTheme.textMuted, size: 20),
                        suffixIcon: IconButton(
                          icon: const Icon(Icons.attach_file_rounded,
                              color: NexusTheme.textMuted, size: 20),
                          onPressed: () {},
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  GestureDetector(
                    onTap: _send,
                    child: Container(
                      width: 46,
                      height: 46,
                      decoration: BoxDecoration(
                        gradient: NexusTheme.chatGradient,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.send_rounded,
                          color: Colors.white, size: 20),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
